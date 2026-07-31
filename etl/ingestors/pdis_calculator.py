"""Calculate PDIS exclusively from retrieved, provenance-bearing evidence."""
from __future__ import annotations

import asyncio
import logging
import math
from datetime import datetime, timezone
from typing import Any

import aiohttp

from ..config import settings
from ..database import COLLECTIONS, batch_upsert, get_db

logger = logging.getLogger(__name__)
FORMULA_VERSION = "2.0-evidence-only"


def _log_component(count: int, maximum: int) -> float:
    if count <= 0 or maximum <= 0:
        return 0.0
    return math.log10(count + 1) / math.log10(maximum + 1) * 100.0


def _clinical_component(trial_count: int, target: int) -> float:
    return min(100.0, trial_count / max(target, 1) * 100.0)


def _structure_component(avg_resolution: float | None, best_resolution: float | None) -> float:
    if avg_resolution is None or best_resolution is None:
        return 0.0
    best_score = max(0.0, min(100.0, (4.0 - best_resolution) / 2.5 * 100.0))
    average_score = max(0.0, min(100.0, (4.0 - avg_resolution) / 2.5 * 100.0))
    return 0.6 * best_score + 0.4 * average_score


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
        await asyncio.sleep(1 / max(settings.rate.ncbi_rps, 1))
        async with session.get(
            f"{settings.api.ncbi_eutils_url}/esearch.fcgi", params=params
        ) as response:
            response.raise_for_status()
            payload = await response.json()
    return int(payload["esearchresult"]["count"])


async def _fetch_clinical_trial_count(
    session: aiohttp.ClientSession,
    gene: str,
    semaphore: asyncio.Semaphore,
) -> int:
    params = {
        "query.term": f"{gene} kinase inhibitor",
        "filter.overallStatus": (
            "RECRUITING|ACTIVE_NOT_RECRUITING|COMPLETED|ENROLLING_BY_INVITATION"
        ),
        "countTotal": "true",
        "pageSize": "1",
    }
    async with semaphore:
        await asyncio.sleep(1 / max(settings.rate.ncbi_rps, 1))
        async with session.get(
            "https://clinicaltrials.gov/api/v2/studies", params=params
        ) as response:
            response.raise_for_status()
            payload = await response.json()
    return int(payload["totalCount"])


async def ingest_pdis() -> int:
    logger.info("Starting evidence-only PDIS calculation (%s)", FORMULA_VERSION)
    db = get_db()

    synthetic_counts = {
        "structures": await db[COLLECTIONS["structures"]].count_documents({"source": "dev_seed"}),
        "bioactivities": await db[COLLECTIONS["bioactivities"]].count_documents({"source": "dev_seed"}),
    }
    if any(synthetic_counts.values()):
        raise RuntimeError(f"PDIS refused synthetic upstream records: {synthetic_counts}")
    verified_upstream = {
        "structures": await db[COLLECTIONS["structures"]].count_documents({"source": "rcsb"}),
        "bioactivities": await db[COLLECTIONS["bioactivities"]].count_documents({
            "source": {"$in": ["chembl", "pubchem"]}
        }),
    }
    if not all(verified_upstream.values()):
        raise RuntimeError(
            "PDIS requires completed verified structure and bioactivity imports; "
            f"available records: {verified_upstream}"
        )

    genes = sorted(
        gene
        for gene in await db[COLLECTIONS["kinases"]].distinct("gene_symbol", {"source": "uniprot"})
        if gene
    )
    if not genes:
        raise RuntimeError("No UniProt-sourced kinase genes are available")

    structure_stats: dict[str, dict[str, Any]] = {}
    async for row in db[COLLECTIONS["structures"]].aggregate([
        {"$match": {"source": "rcsb"}},
        {"$unwind": "$gene_symbols"},
        {"$group": {
            "_id": "$gene_symbols",
            "pdb_count": {"$sum": 1},
            "avg_resolution": {"$avg": "$resolution"},
            "best_resolution": {"$min": "$resolution"},
        }},
    ]):
        structure_stats[str(row["_id"])] = row

    compound_counts: dict[str, int] = {}
    async for row in db[COLLECTIONS["bioactivities"]].aggregate([
        {"$match": {
            "source": {"$in": ["chembl", "pubchem"]},
            "target_gene_symbol": {"$in": genes},
            "compound_id": {"$nin": [None, ""]},
        }},
        {"$group": {"_id": "$target_gene_symbol", "compounds": {"$addToSet": "$compound_id"}}},
        {"$project": {"count": {"$size": "$compounds"}}},
    ]):
        compound_counts[str(row["_id"])] = int(row["count"])

    timeout = aiohttp.ClientTimeout(total=45)
    semaphore = asyncio.Semaphore(max(settings.rate.ncbi_rps, 1))
    evidence: dict[str, tuple[int, int]] = {}
    failures: dict[str, str] = {}

    async with aiohttp.ClientSession(timeout=timeout) as session:
        async def retrieve(gene: str) -> None:
            try:
                publication_count, trial_count = await asyncio.gather(
                    _fetch_pubmed_count(session, gene, semaphore),
                    _fetch_clinical_trial_count(session, gene, semaphore),
                )
                evidence[gene] = (publication_count, trial_count)
            except Exception as exc:
                failures[gene] = str(exc)

        for offset in range(0, len(genes), 25):
            await asyncio.gather(*(retrieve(gene) for gene in genes[offset : offset + 25]))

    if failures:
        logger.warning(
            "PDIS omitted %d genes whose live evidence could not be verified",
            len(failures),
        )
    if not evidence:
        raise RuntimeError("No genes had complete PubMed and ClinicalTrials.gov evidence")

    max_publications = max(counts[0] for counts in evidence.values())
    max_compounds = max(compound_counts.values(), default=0)
    weights = {
        "citation": settings.rate.pdis_w_citation,
        "clinical_trials": settings.rate.pdis_w_clinical,
        "structure": settings.rate.pdis_w_structure,
        "compound_diversity": settings.rate.pdis_w_compound_diversity,
    }
    weight_total = sum(weights.values())
    retrieved_at = datetime.now(timezone.utc)
    records: list[dict[str, Any]] = []

    for gene, (publication_count, trial_count) in evidence.items():
        structures = structure_stats.get(gene, {})
        compound_count = compound_counts.get(gene, 0)
        components = {
            "citation": _log_component(publication_count, max_publications),
            "clinical_trials": _clinical_component(
                trial_count, settings.rate.pdis_clinical_target
            ),
            "structure": _structure_component(
                structures.get("avg_resolution"), structures.get("best_resolution")
            ),
            "compound_diversity": _log_component(compound_count, max_compounds),
        }
        total = sum(weights[name] * value for name, value in components.items()) / weight_total
        records.append({
            "gene_symbol": gene,
            "pdis_total": round(total, 2),
            "components": {name: round(value, 2) for name, value in components.items()},
            "raw_values": {
                "pubmed_publication_count": publication_count,
                "clinical_trial_count": trial_count,
                "pdb_count": int(structures.get("pdb_count", 0)),
                "best_resolution_angstrom": structures.get("best_resolution"),
                "average_resolution_angstrom": structures.get("avg_resolution"),
                "distinct_compound_count": compound_count,
            },
            "weights": weights,
            "formula_version": FORMULA_VERSION,
            "source": "pdis_calculator",
            "source_urls": {
                "publications": f"{settings.api.ncbi_eutils_url}/esearch.fcgi",
                "trials": "https://clinicaltrials.gov/api/v2/studies",
                "structures": "https://www.rcsb.org/",
                "compounds": settings.api.chembl_url,
            },
            "retrieved_at": retrieved_at,
        })

    await db[COLLECTIONS["pdis"]].delete_many({"source": "pdis_calculator"})
    await batch_upsert(
        COLLECTIONS["pdis"], records, key_fields=["gene_symbol"], batch_size=500
    )
    logger.info("Stored %d evidence-only PDIS scores", len(records))
    return len(records)
