from __future__ import annotations

import asyncio
import logging
from typing import Any

import aiohttp

from ..config import settings
from ..database import COLLECTIONS, batch_upsert, get_db

logger = logging.getLogger(__name__)

AMBIT_AID = 1433
AMBIT_PUBMED_ID = "18183025"
AMBIT_DOI = "10.1038/nbt.2008.1398"
AMBIT_JOURNAL = "Nature Biotechnology"
AMBIT_YEAR = 2008


# ---------------------------------------------------------------------------
# Low-level HTTP helpers
# ---------------------------------------------------------------------------


async def _fetch_json(
    session: aiohttp.ClientSession, url: str, sem: asyncio.Semaphore, label: str = "", timeout: int = 30
) -> dict | None:
    async with sem:
        await asyncio.sleep(1 / settings.rate.ncbi_rps)
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
                if resp.status != 200:
                    logger.debug("%s returned %d for %s", label, resp.status, _trunc(url, 100))
                    return None
                return await resp.json()
        except Exception as exc:
            logger.debug("Error fetching %s: %s", label, exc)
            return None


async def _post_json(
    session: aiohttp.ClientSession,
    url: str,
    payload: dict,
    sem: asyncio.Semaphore,
    label: str = "",
) -> dict | None:
    async with sem:
        await asyncio.sleep(1 / settings.rate.ncbi_rps)
        try:
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=60)) as resp:
                if resp.status != 200:
                    logger.debug("%s POST returned %d", label, resp.status)
                    return None
                return await resp.json()
        except Exception as exc:
            logger.debug("Error POST %s: %s", label, exc)
            return None


def _trunc(text: str, n: int = 80) -> str:
    return text if len(text) <= n else text[: n - 3] + "..."


# ---------------------------------------------------------------------------
# Compound property resolution from PubChem
# ---------------------------------------------------------------------------


async def resolve_cid_properties(
    cids: list[int],
    session: aiohttp.ClientSession,
    sem: asyncio.Semaphore,
) -> dict[int, dict[str, Any]]:
    """Fetch compound names, SMILES, and InChIKeys for a list of PubChem CIDs."""
    if not cids:
        return {}

    # PubChem's POST property endpoint uses a different format
    cid_str = ",".join(str(c) for c in cids)
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid_str}/property/Title,IsomericSMILES,InChIKey/JSON"
    data = await _fetch_json(session, url, sem, "CID properties", timeout=60)
    if not data:
        return {}

    props = data.get("PropertyTable", {}).get("Properties", [])
    return {
        p["CID"]: {
            "cid": p["CID"],
            "name": p.get("Title", ""),
            "smiles": p.get("IsomericSMILES", ""),
            "inchikey": p.get("InChIKey", ""),
        }
        for p in props
        if p.get("CID")
    }


# ---------------------------------------------------------------------------
# RefSeq → UniProt mapping (via UniProt search API)
# ---------------------------------------------------------------------------


async def _map_refseq_to_gene(
    refseq_ids: list[str],
    session: aiohttp.ClientSession,
    sem: asyncio.Semaphore,
) -> dict[str, str]:
    """Batch-map RefSeq protein accessions (e.g. NP_005219) to gene symbols.

    Uses the UniProtKB search API with batched OR queries.
    Returns {refseq_accession: gene_symbol}.
    """
    if not refseq_ids:
        return {}

    # Remove version suffixes (.1, .2 etc.) for matching
    base_ids = sorted({rs.split(".")[0] for rs in refseq_ids})
    logger.info("Mapping %d unique RefSeq accessions to gene symbols", len(base_ids))
    result: dict[str, str] = {}

    # Also build lookup from our own kinases' UniProt cross-refs
    db = get_db()
    uniprot_to_gene: dict[str, str] = {}
    async for doc in db[COLLECTIONS["kinases"]].find({}, {"uniprot_id": 1, "gene_symbol": 1, "_id": 0}):
        uid: str = doc.get("uniprot_id", "")
        gs: str = doc.get("gene_symbol", "")
        if uid and gs:
            uniprot_to_gene[uid] = gs

    batch_size = 50
    base_url = "https://rest.uniprot.org/uniprotkb/search"

    for i in range(0, len(base_ids), batch_size):
        batch = base_ids[i : i + batch_size]
        query_str = " OR ".join(batch)
        params = {"query": query_str, "format": "json", "size": 100}

        async with sem:
            await asyncio.sleep(1 / settings.rate.uniprot_rps)
            try:
                async with session.get(base_url, params=params, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status != 200:
                        logger.debug("UniProt search returned %d for batch %d", resp.status, i)
                        continue
                    data = await resp.json()
            except Exception as exc:
                logger.debug("UniProt search error at batch %d: %s", i, exc)
                continue

        for entry in data.get("results", []):
            uniprot = entry.get("primaryAccession", "")
            gene = entry.get("genes", [{}])[0].get("geneName", {}).get("value", "")
            if not gene and not uniprot:
                continue
            gene_symbol = gene or uniprot_to_gene.get(uniprot, "")
            if not gene_symbol:
                continue
            xrefs = entry.get("uniProtKBCrossReferences", [])
            refseqs = [x.get("id", "").split(".")[0] for x in xrefs if x.get("database") == "RefSeq"]
            for rs in refseqs:
                if rs in batch:
                    result[rs] = gene_symbol
            # Also map the RefSeq from free text match
            # (the query returns entries that match, so the ID is at least partially resolved)
            if uniprot in uniprot_to_gene:
                gs2 = uniprot_to_gene[uniprot]
                for rs in refseqs:
                    if rs in batch:
                        result[rs] = gs2

    # Fallback: try direct UniProt query for any remaining unmatched accessions
    matched = len(result)
    unmatched = len([x for x in base_ids if x not in result])
    if unmatched:
        logger.info("UniProt mapping matched %d/%d, trying fallback for %d unmatched", matched, len(base_ids), unmatched)
        for rs in base_ids:
            if rs in result:
                continue
            params = {"query": rs, "format": "json", "size": 1}
            async with sem:
                await asyncio.sleep(1 / settings.rate.uniprot_rps)
                try:
                    async with session.get(base_url, params=params, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                        if resp.status != 200:
                            continue
                        data = await resp.json()
                except Exception:
                    continue
            for entry in data.get("results", []):
                uniprot = entry.get("primaryAccession", "")
                gene = entry.get("genes", [{}])[0].get("geneName", {}).get("value", "")
                gene_symbol = gene or uniprot_to_gene.get(uniprot, "")
                if gene_symbol and gene_symbol in uniprot_to_gene.values():
                    result[rs] = gene_symbol

    logger.info("Mapped %d/%d RefSeq accessions to gene symbols", len(result), len(base_ids))
    return result


# ---------------------------------------------------------------------------
# Ambit Kinase Profiling Dataset (PubChem AID 1433)
# ---------------------------------------------------------------------------


async def fetch_ambit_dataset(
    session: aiohttp.ClientSession,
    sem: asyncio.Semaphore,
) -> list[dict[str, Any]]:
    """Fetch and parse the Ambit kinase profiling dataset from PubChem AID 1433.

    This assay (Karaman et al. 2008) measured Kd values for 38 kinase inhibitors
    across 317 kinases. It is the most comprehensive published kinase-inhibitor
    selectivity dataset.
    """
    logger.info("Fetching Ambit kinase profiling dataset (AID %d)", AMBIT_AID)

    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/assay/aid/{AMBIT_AID}/concise/JSON"
    data = await _fetch_json(session, url, sem, "Ambit dataset", timeout=60)
    if not data:
        logger.error("Failed to fetch Ambit dataset")
        return []

    table = data.get("Table", {})
    rows = table.get("Row", [])
    logger.info("Fetched Ambit table with %d rows", len(rows))

    # Build UniProt → gene_symbol lookup from our kinases
    db = get_db()
    uniprot_to_gene: dict[str, str] = {}
    async for doc in db[COLLECTIONS["kinases"]].find({}, {"uniprot_id": 1, "gene_symbol": 1, "_id": 0}):
        uid: str = doc.get("uniprot_id", "")
        gs: str = doc.get("gene_symbol", "")
        if uid and gs:
            uniprot_to_gene[uid] = gs
    logger.info("Kinase lookup: %d UniProt entries", len(uniprot_to_gene))

    # Collect unique RefSeq accessions from the Ambit data, then batch-map to UniProt
    all_refseqs: set[str] = set()
    for row in rows:
        cells = row.get("Cell", [])
        if len(cells) >= 5:
            acc = cells[4].strip()
            if acc:
                all_refseqs.add(acc)

    refseq_to_gene: dict[str, str] = await _map_refseq_to_gene(list(all_refseqs), session, sem)
    logger.info("RefSeq → gene mapping: %d accessions resolved", len(refseq_to_gene))

    ambit_entries: list[dict[str, Any]] = []
    cid_set: set[int] = set()

    for row in rows:
        cells = row.get("Cell", [])
        if len(cells) < 12:
            continue

        cid_str = cells[2].strip()
        outcome = cells[3].strip()
        target_acc = cells[4].strip()
        value_uM = cells[6].strip()
        activity_name = cells[7].strip()
        assay_name = cells[8].strip()
        pmid = cells[10].strip()

        if outcome.lower() != "active":
            continue
        if not cid_str or cid_str == "0":
            continue

        cid = int(cid_str)

        # Map RefSeq accession to gene
        gene_symbol = refseq_to_gene.get(target_acc)
        if not gene_symbol:
            continue

        cid_set.add(cid)

        value_nm = 0.0
        if value_uM:
            try:
                value_nm = float(value_uM) * 1000.0
            except ValueError:
                pass

        ambit_entries.append({
            "compound_id": f"pubchem:{cid}",
            "pubchem_cid": cid,
            "compound_name": "",
            "canonical_smiles": "",
            "assay_type": (activity_name or "Kd").upper(),
            "standard_value": value_nm,
            "standard_units": "nM",
            "standard_relation": "=",
            "target_chembl_id": "",
            "target_organism": "Homo sapiens",
            "target_gene_symbol": gene_symbol,
            "binding_type": "Orthosteric Type I",
            "pubmed_ids": [pmid] if pmid else [AMBIT_PUBMED_ID],
            "doi": AMBIT_DOI,
            "pchembl_value": None,
            "assay_aid": AMBIT_AID,
            "assay_name": assay_name,
            "document_journal": AMBIT_JOURNAL,
            "document_year": AMBIT_YEAR,
            "source": "pubchem",
        })

    logger.info("Parsed %d Ambit entries for our kinases (%d unique CIDs)", len(ambit_entries), len(cid_set))

    # Resolve compound names and SMILES
    if cid_set:
        props = await resolve_cid_properties(list(cid_set), session, sem)
        name_count = 0
        for entry in ambit_entries:
            cid = entry["pubchem_cid"]
            if cid in props:
                entry["compound_name"] = props[cid]["name"]
                entry["canonical_smiles"] = props[cid]["smiles"]
                if props[cid]["name"]:
                    name_count += 1
        logger.info("Resolved names for %d/%d unique Ambit compounds", name_count, len(props))

    return ambit_entries


# ---------------------------------------------------------------------------
# Deduplication helpers
# ---------------------------------------------------------------------------


async def _collect_existing_smiles() -> set[str]:
    """Collect all unique SMILES already in bioactivities (ChEMBL source)."""
    db = get_db()
    existing: set[str] = set()
    cursor = db[COLLECTIONS["bioactivities"]].find(
        {"source": "chembl", "canonical_smiles": {"$ne": ""}},
        {"canonical_smiles": 1, "_id": 0},
    ).batch_size(10000)
    async for doc in cursor:
        smiles = doc.get("canonical_smiles", "")
        if smiles and isinstance(smiles, str):
            existing.add(smiles.strip())
    return existing


# ---------------------------------------------------------------------------
# PubChem main entry point
# ---------------------------------------------------------------------------


async def ingest_pubchem() -> dict[str, int]:
    """Ingest ligand data from PubChem.

    Steps:
    1. Fetch Ambit kinase profiling dataset (AID 1433) — Kd values for
       38 inhibitors across 317 kinases.
    2. Resolve compound names and SMILES from PubChem.
    3. Deduplicate against existing ChEMBL bioactivities (by SMILES).
    4. Store new entries in the bioactivities collection.
    """
    logger.info("Starting PubChem data ingestion")
    sem = asyncio.Semaphore(settings.rate.ncbi_rps)
    results: dict[str, int] = {}

    async with aiohttp.ClientSession() as session:
        # Step 1: Fetch Ambit dataset
        ambit_entries = await fetch_ambit_dataset(session, sem)
        results["ambit_raw"] = len(ambit_entries)

        if not ambit_entries:
            logger.warning("No Ambit entries fetched — nothing to store")
            return results

        # Step 2: Deduplicate against existing ChEMBL data (by SMILES)
        existing_smiles = await _collect_existing_smiles()
        logger.info("Existing ChEMBL SMILES in DB: %d", len(existing_smiles))

        deduped: list[dict[str, Any]] = []
        dedup_count = 0
        for entry in ambit_entries:
            smiles = entry.get("canonical_smiles", "")
            if smiles and isinstance(smiles, str) and smiles.strip() in existing_smiles:
                dedup_count += 1
                continue
            deduped.append(entry)

        results["deduped_against_chembl"] = dedup_count
        logger.info("Deduplicated %d entries already covered by ChEMBL", dedup_count)

        # Step 3: Store
        if deduped:
            stored = await batch_upsert(
                COLLECTIONS["bioactivities"],
                deduped,
                key_fields=["pubchem_cid", "target_gene_symbol"],
                batch_size=500,
            )
            results["ambit_stored"] = len(deduped)
            logger.info("Stored %d new Ambit entries", len(deduped))
        else:
            results["ambit_stored"] = 0
            logger.info("No new Ambit entries to store (all duplicates)")

    logger.info("PubChem ingestion complete: %s", results)
    return results
