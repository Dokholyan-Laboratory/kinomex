from __future__ import annotations

import asyncio
import logging
import math
from typing import Any

import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import settings
from ..database import COLLECTIONS, batch_upsert, get_db

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Component calculators
# ---------------------------------------------------------------------------

def _citation_component(pub_count: int, lmax: int) -> float:
    if lmax <= 0:
        return 0.0
    if pub_count <= 0:
        return 0.0
    return math.log10(pub_count + 1) / math.log10(lmax + 1) * 100.0


def _clinical_component(trial_count: int, target: int) -> float:
    return min(100.0, (trial_count / max(target, 1)) * 100.0)


def _structure_component(avg_resolution: float | None, best_res: float | None) -> float:
    if avg_resolution is None or best_res is None:
        return 0.0
    if best_res <= 1.5:
        score_res = 100.0
    elif best_res >= 4.0:
        score_res = 0.0
    else:
        score_res = (4.0 - best_res) / (4.0 - 1.5) * 100.0
    avg_score = max(0.0, min(100.0, (4.0 - avg_resolution) / (4.0 - 1.5) * 100.0))
    return 0.6 * score_res + 0.4 * avg_score


async def _fetch_pubmed_count(
    session: aiohttp.ClientSession,
    gene: str,
    semaphore: asyncio.Semaphore,
) -> int:
    params: dict[str, Any] = {
        "db": "pubmed",
        "term": f"{gene}[Gene] AND kinase[Title/Abstract]",
        "rettype": "count",
        "retmode": "json",
    }
    if settings.api.pubmed_api_key:
        params["api_key"] = settings.api.pubmed_api_key
    async with semaphore:
        await asyncio.sleep(1 / settings.rate.ncbi_rps)
        async with session.get(
            f"{settings.api.ncbi_eutils_url}/esearch.fcgi",
            params=params,
        ) as resp:
            resp.raise_for_status()
            data = await resp.json()
    return int(data.get("esearchresult", {}).get("count", 0))


async def _fetch_clinicaltrials_count(
    session: aiohttp.ClientSession,
    gene: str,
    semaphore: asyncio.Semaphore,
) -> int:
    params = {
        "query.term": f"{gene} kinase inhibitor",
        "filter.overallStatus": "RECRUITING|ACTIVE_NOT_RECRUITING|COMPLETED|ENROLLING_BY_INVITATION",
        "countTotal": "true",
        "pageSize": "1",
    }
    async with semaphore:
        await asyncio.sleep(1 / settings.rate.ncbi_rps)
        try:
            async with session.get(
                "https://clinicaltrials.gov/api/v2/studies",
                params=params,
            ) as resp:
                resp.raise_for_status()
                data = await resp.json()
                return int(data.get("totalCount", 0))
        except Exception:
            return 0


# ---------------------------------------------------------------------------
# Main ingestor
# ---------------------------------------------------------------------------

async def ingest_pdis() -> int:
    """Calculate PDIS only for known kinases (from group mapping)."""
    logger.info("Starting PDIS calculation")
    db = get_db()
    sem = asyncio.Semaphore(settings.rate.ncbi_rps)
    cfg = settings.rate

    # Load known kinases from group mapping (fast, ~518 genes)
    known_kinase_docs: list[dict[str, Any]] = []
    async for doc in db[COLLECTIONS["kinases"]].find(
        {"group": {"$exists": True, "$ne": None, "$ne": ""}},
        {"gene_symbol": 1, "_id": 0},
    ):
        gs = doc.get("gene_symbol", "")
        if gs:
            known_kinase_docs.append(doc)

    logger.info("Calculating PDIS for %d known kinases", len(known_kinase_docs))

    # Aggregate structure stats
    pipeline = [
        {"$group": {
            "_id": "$gene_symbol",
            "pdb_count": {"$sum": 1},
            "avg_resolution": {"$avg": "$resolution"},
            "best_resolution": {"$min": "$resolution"},
        }}
    ]
    struct_stats: dict[str, dict[str, Any]] = {}
    async for doc in db[COLLECTIONS["structures"]].aggregate(pipeline):
        gs = doc.get("_id", "")
        if gs:
            struct_stats[gs] = {
                "pdb_count": doc.get("pdb_count", 0),
                "avg_resolution": doc.get("avg_resolution"),
                "best_resolution": doc.get("best_resolution"),
            }

    # Fetch publication counts in parallel batches
    gene_pubcounts: dict[str, int] = {}
    gene_list = [doc["gene_symbol"] for doc in known_kinase_docs if doc.get("gene_symbol")]

    # Batch PubMed queries (10 concurrent)
    pub_sem = asyncio.Semaphore(10)
    async with aiohttp.ClientSession() as session:
        async def fetch_pub(gene: str) -> tuple[str, int]:
            try:
                count = await _fetch_pubmed_count(session, gene, sem)
                return gene, count
            except Exception:
                return gene, 0

        tasks = [fetch_pub(g) for g in gene_list]
        results = await asyncio.gather(*tasks)
        for gene, count in results:
            gene_pubcounts[gene] = count

    lmax = max(gene_pubcounts.values()) if gene_pubcounts else 1

    # Fetch clinical trial counts in parallel batches
    gene_trialcounts: dict[str, int] = {}
    trial_sem = asyncio.Semaphore(10)
    async with aiohttp.ClientSession() as session:
        async def fetch_trial(gene: str) -> tuple[str, int]:
            try:
                count = await _fetch_clinicaltrials_count(session, gene, sem)
                return gene, count
            except Exception:
                return gene, 0

        tasks = [fetch_trial(g) for g in gene_list]
        results = await asyncio.gather(*tasks)
        for gene, count in results:
            gene_trialcounts[gene] = count

    # Compute PDIS
    pdis_records: list[dict[str, Any]] = []
    for gs in gene_list:
        pub_count = gene_pubcounts.get(gs, 0)
        trial_count = gene_trialcounts.get(gs, 0)

        ss = struct_stats.get(gs, {})
        f_citation = _citation_component(pub_count, lmax)
        g_clinical = _clinical_component(trial_count, cfg.pdis_clinical_target)
        h_structure = _structure_component(
            ss.get("avg_resolution"), ss.get("best_resolution")
        )
        patent_approx = ss.get("pdb_count", 0) * 2
        m_patent = min(100.0, patent_approx / 5.0 * 10.0)

        pdis_total = (
            cfg.pdis_w_citation * f_citation
            + cfg.pdis_w_clinical * g_clinical
            + cfg.pdis_w_structure * h_structure
            + cfg.pdis_w_patent * m_patent
        )

        pdis_records.append({
            "gene_symbol": gs,
            "pdis_total": round(pdis_total, 2),
            "components": {
                "citation": round(f_citation, 2),
                "clinical_trials": round(g_clinical, 2),
                "structure": round(h_structure, 2),
                "patent_proxy": round(m_patent, 2),
            },
            "raw_values": {
                "pub_count": pub_count,
                "trial_count": trial_count,
                "pdb_count": ss.get("pdb_count", 0),
                "best_resolution": ss.get("best_resolution"),
            },
            "source": "pdis_calculator",
        })

    if pdis_records:
        await batch_upsert(
            COLLECTIONS["pdis"],
            pdis_records,
            key_fields=["gene_symbol"],
            batch_size=500,
        )
    logger.info("PDIS calculation complete – %d scores stored", len(pdis_records))
    return len(pdis_records)
