from __future__ import annotations

import asyncio
import logging
from typing import Any

import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import settings
from ..database import COLLECTIONS, batch_upsert, get_db

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Conformation keywords
# ---------------------------------------------------------------------------
DFG_IN_KEYWORDS = {"dfg-in", "dfg in", "active", "activation loop-in"}
DFG_OUT_KEYWORDS = {"dfg-out", "dfg out", "inactive", "activation loop-out"}
ALPHAC_IN_KEYWORDS = {"alphac-in", "alpha c-in", "alpha-c in"}
ALPHAC_OUT_KEYWORDS = {"alphac-out", "alpha c-out", "alpha-c out"}


def _classify_conformation(title: str, keywords: list[str]) -> dict[str, bool]:
    """Heuristic classification of backbone conformation from title & keywords."""
    text = (title + " " + " ".join(keywords)).lower()
    return {
        "dfg_in": any(kw in text for kw in DFG_IN_KEYWORDS),
        "dfg_out": any(kw in text for kw in DFG_OUT_KEYWORDS),
        "alphac_in": any(kw in text for kw in ALPHAC_IN_KEYWORDS),
        "alphac_out": any(kw in text for kw in ALPHAC_OUT_KEYWORDS),
    }


async def _fetch_page(
    session: aiohttp.ClientSession,
    url: str,
    payload: dict[str, Any],
    semaphore: asyncio.Semaphore,
) -> dict[str, Any]:
    async with semaphore:
        await asyncio.sleep(1 / settings.rate.pdb_rps)
        async with session.post(url, json=payload) as resp:
            resp.raise_for_status()
            return await resp.json()


def _build_search_payload(offset: int, size: int) -> dict[str, Any]:
    """RCSB Search API v2 query for human kinase structures."""
    return {
        "query": {
            "type": "group",
            "logical_operator": "and",
            "nodes": [
                {
                    "type": "terminal",
                    "service": "text",
                    "parameters": {
                        "attribute": "rcsb_entity_source_organism.ncbi_scientific_name",
                        "operator": "exact_match",
                        "value": "Homo sapiens",
                    },
                },
                {
                    "type": "terminal",
                    "service": "text",
                    "parameters": {
                        "attribute": "rcsb_entry_info.resolution_combined",
                        "operator": "less",
                        "value": settings.rate.pdb_max_resolution,
                    },
                },
            ],
        },
        "return_type": "entry",
        "request_options": {
            "paginate": {"start": offset, "rows": size},
            "results_content_type": ["experimental"],
        },
    }


def _extract_structure(entry: dict[str, Any]) -> dict[str, Any]:
    """Parse a single RCSB search result into our document schema."""
    pdb_id = entry.get("identifier", "")
    attrs = {a["attribute"]: a.get("value") for a in entry.get("group_by_group_nodes", [])}

    # Extract from nested attrs when available
    title = ""
    resolution = None
    method = ""
    ligands: list[str] = []
    gene_symbols: list[str] = []
    keywords: list[str] = []

    container = entry.get("rcsb_entry_info", {})
    resolution = container.get("resolution_combined", [None])
    if isinstance(resolution, list):
        resolution = resolution[0] if resolution else None

    method = container.get("experimental_method", "")

    # Gene symbols from polymer entities
    for pe in entry.get("rcsb_polymer_entities", []):
        for org in pe.get("rcsb_entity_source_organism", []):
            gn = org.get("rcsb_gene_name", "")
            if gn:
                gene_symbols.append(gn)
        # ligands from non-polymer components
        for comp in pe.get("rcsb_nonpolymer_entities", []):
            chem_id = comp.get("rcsb_chem_comp_descriptor", {}).get("formula", "")
            if chem_id:
                ligands.append(chem_id)

    title = entry.get("struct", {}).get("title", "") if isinstance(entry.get("struct"), dict) else ""
    keywords = entry.get("struct_keywords", {}).get("pdbx_keywords", []) if isinstance(entry.get("struct_keywords"), dict) else []

    conf = _classify_conformation(title, keywords)

    return {
        "pdb_id": pdb_id,
        "title": title,
        "resolution": resolution,
        "experimental_method": method,
        "bound_ligands": ligands,
        "gene_symbols": list(set(gene_symbols)),
        "conformation": conf,
        "keywords": keywords,
        "source": "rcsb",
    }


async def ingest_structures() -> int:
    """Fetch kinase structures from RCSB PDB and store them."""
    logger.info("Starting PDB structure ingestion")
    sem = asyncio.Semaphore(settings.rate.pdb_rps)
    cfg = settings.api
    url = cfg.rcsb_url

    # Build a set of known gene symbols from the DB for cross-reference
    db = get_db()
    known_genes: set[str] = set()
    async for doc in db[COLLECTIONS["kinases"]].find({}, {"gene_symbol": 1, "_id": 0}):
        if doc.get("gene_symbol"):
            known_genes.add(doc["gene_symbol"].upper())

    all_structures: list[dict[str, Any]] = []
    offset = 0
    size = settings.rate.pdb_batch_size
    total_estimate: int | None = None

    async with aiohttp.ClientSession() as session:
        while True:
            payload = _build_search_payload(offset, size)
            try:
                data = await _fetch_page(session, url, payload, sem)
            except Exception as exc:
                logger.error("PDB fetch failed at offset %d: %s", offset, exc)
                break

            total = data.get("total_count", 0)
            if total_estimate is None:
                total_estimate = total
                logger.info("PDB reports %d matching structures", total_estimate)

            result_list = data.get("result_set", [])
            if not result_list:
                break

            # Enrich results with full entry info
            pdb_ids = [r["identifier"] for r in result_list]
            for entry_data in result_list:
                struct = _extract_structure(entry_data)
                # Only keep structures whose gene symbols overlap known kinases
                struct["gene_symbols"] = [
                    g for g in struct["gene_symbols"] if g.upper() in known_genes
                ]
                all_structures.append(struct)

            offset += size
            if offset >= total:
                break

    if all_structures:
        await batch_upsert(
            COLLECTIONS["structures"],
            all_structures,
            key_fields=["pdb_id"],
            batch_size=settings.rate.pdb_batch_size,
        )
    logger.info("PDB ingestion complete – %d structure records stored", len(all_structures))
    return len(all_structures)
