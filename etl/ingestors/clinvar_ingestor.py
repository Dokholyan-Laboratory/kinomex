from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from typing import Any

import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import settings
from ..database import COLLECTIONS, batch_upsert, get_db

logger = logging.getLogger(__name__)

MUTATION_PATTERN = re.compile(r"^([A-Z])(\d+)([A-Z*])$")
AA3_TO_1 = {
    "Ala": "A", "Arg": "R", "Asn": "N", "Asp": "D", "Cys": "C",
    "Gln": "Q", "Glu": "E", "Gly": "G", "His": "H", "Ile": "I",
    "Leu": "L", "Lys": "K", "Met": "M", "Phe": "F", "Pro": "P",
    "Ser": "S", "Thr": "T", "Trp": "W", "Tyr": "Y", "Val": "V",
    "Ter": "*",
}

def _parse_mutation_code(code: str) -> dict[str, Any] | None:
    m = MUTATION_PATTERN.match(code)
    if not m:
        return None
    return {
        "wildtype_aa": m.group(1),
        "position": int(m.group(2)),
        "mutant_aa": m.group(3),
    }


async def ingest_variants() -> int:
    """Ingest variants reported directly by NCBI ClinVar."""
    logger.info("Starting verified NCBI ClinVar variant ingestion")

    all_variants: list[dict[str, Any]] = []

    db = get_db()

    known_genes: set[str] = set()
    async for doc in db[COLLECTIONS["kinases"]].find({}, {"gene_symbol": 1, "_id": 0}):
        gs = doc.get("gene_symbol", "")
        if gs:
            known_genes.add(gs)

    # Query NCBI ClinVar for every known kinase symbol.
    sem = asyncio.Semaphore(settings.rate.ncbi_rps)
    ncbi_count = 0

    async with aiohttp.ClientSession() as session:
        for gene in sorted(known_genes):
            if not gene:
                continue
            term = f"({gene}[Gene]) AND (missense[All Fields])"
            try:
                async with sem:
                    await asyncio.sleep(1 / settings.rate.ncbi_rps)
                    async with session.get(
                        f"{settings.api.ncbi_eutils_url}/esearch.fcgi",
                        params={"db": "clinvar", "term": term, "retmax": 200, "retmode": "json"},
                        timeout=aiohttp.ClientTimeout(total=15),
                    ) as resp:
                        resp.raise_for_status()
                        data = await resp.json()
                ids = data.get("esearchresult", {}).get("idlist", [])
                if not ids:
                    continue

                # Fetch summaries in batches
                for i in range(0, len(ids), 50):
                    batch = ids[i:i+50]
                    try:
                        async with sem:
                            await asyncio.sleep(1 / settings.rate.ncbi_rps)
                            async with session.get(
                                f"{settings.api.ncbi_eutils_url}/esummary.fcgi",
                                params={"db": "clinvar", "id": ",".join(batch), "retmode": "json"},
                                timeout=aiohttp.ClientTimeout(total=15),
                            ) as resp:
                                resp.raise_for_status()
                                sdata = await resp.json()
                        result = sdata.get("result", {})
                        for uid in batch:
                            rec = result.get(uid, {})
                            if not isinstance(rec, dict):
                                continue
                            title = rec.get("title", "")
                            protein_change = rec.get("protein_change", "")
                            m_match = re.search(r"\(p\.([A-Z][a-z]{0,2})(\d+)([A-Za-z*][a-z]*)\)", title)
                            if not m_match and protein_change:
                                pc_first = protein_change.split(",")[0].strip()
                                pc_match = re.match(r"([A-Z*])(\d+)([A-Z*])$", pc_first)
                                if pc_match:
                                    m_match = pc_match
                            if m_match:
                                wt = AA3_TO_1.get(m_match.group(1), m_match.group(1))
                                pos = m_match.group(2)
                                mut = AA3_TO_1.get(m_match.group(3), m_match.group(3))
                                code = f"{wt}{pos}{mut}"
                                existing_codes = {v["mutation_code"] for v in all_variants if v["gene_symbol"] == gene}
                                if code in existing_codes:
                                    continue
                                parsed = _parse_mutation_code(code)
                                if parsed is None:
                                    continue
                                clin_sig = rec.get("clinical_significance", {}).get("description")
                                all_variants.append({
                                    "gene_symbol": gene,
                                    "mutation_code": code,
                                    "wildtype_aa": parsed["wildtype_aa"],
                                    "position": parsed["position"],
                                    "mutant_aa": parsed["mutant_aa"],
                                    "pathogenicity": clin_sig or "Not provided",
                                    "source_title": title[:500],
                                    "clinvar_uid": uid,
                                    "source": "clinvar",
                                    "source_url": f"https://www.ncbi.nlm.nih.gov/clinvar/variation/{uid}/",
                                    "retrieved_at": datetime.now(timezone.utc),
                                })
                                ncbi_count += 1
                    except Exception as exc:
                        logger.debug("ClinVar summary batch failed: %s", exc)
                        continue
                if ncbi_count % 100 == 0:
                    logger.info("ClinVar progress: %d variants found so far", ncbi_count)
            except Exception as exc:
                logger.debug("ClinVar search failed for %s: %s", gene, exc)
                continue

    logger.info("Fetched %d NCBI ClinVar mutations", ncbi_count)

    if not all_variants:
        raise RuntimeError("ClinVar returned no valid kinase variants; existing data was not changed")

    await db[COLLECTIONS["variants"]].delete_many({"source": "clinvar"})
    await batch_upsert(
        COLLECTIONS["variants"],
        all_variants,
        key_fields=["gene_symbol", "mutation_code", "clinvar_uid"],
        batch_size=500,
    )
    logger.info("Variant ingestion complete – %d records stored", len(all_variants))
    return len(all_variants)
