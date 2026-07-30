"""Fetch disease annotations from UniProt for all kinases."""
from __future__ import annotations
import asyncio
import logging
import aiohttp
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..database import COLLECTIONS

logger = logging.getLogger(__name__)

BATCH_SIZE = 20
CONCURRENCY = 5
UNIPROT_DELAY = 0.35


async def fetch_diseases(db: AsyncIOMotorDatabase) -> None:
    """Fetch disease annotations from UniProt and store in diseases collection."""
    logger.info("Fetching disease annotations from UniProt...")

    kinases = await db.kinases.distinct("uniprot_id")
    logger.info("Found %d kinases with UniProt IDs", len(kinases))

    diseases_col = db[COLLECTIONS["diseases"]]
    await diseases_col.drop()

    total_inserted = 0
    sem = asyncio.Semaphore(CONCURRENCY)

    async with aiohttp.ClientSession() as session:
        for i in range(0, len(kinases), BATCH_SIZE):
            batch = [u for u in kinases[i : i + BATCH_SIZE] if u]
            if not batch:
                continue

            async def _limited(uid: str) -> tuple[list, list]:
                async with sem:
                    result = await _fetch_entry(session, uid)
                    await asyncio.sleep(UNIPROT_DELAY)
                    return result

            results = await asyncio.gather(*[_limited(uid) for uid in batch])

            docs = []
            for uid, (gene_name, diseases) in zip(batch, results):
                if diseases:
                    docs.append({
                        "uniprot_id": uid,
                        "gene_symbol": gene_name,
                        "diseases": diseases,
                    })

            if docs:
                await diseases_col.insert_many(docs, ordered=False)
                total_inserted += len(docs)

            if (i // BATCH_SIZE) % 20 == 0:
                logger.info(
                    "Diseases progress: %d/%d kinases, %d with diseases",
                    i + len(batch), len(kinases), total_inserted,
                )

    await diseases_col.create_index("gene_symbol")
    final_count = await diseases_col.count_documents({})
    logger.info("Diseases complete: %d kinases with disease annotations", final_count)


async def _fetch_entry(
    session: aiohttp.ClientSession,
    uid: str,
) -> tuple[str, list[dict]]:
    """Fetch a single UniProt entry and extract disease annotations."""
    url = f"https://rest.uniprot.org/uniprotkb/{uid}.json"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                return ("", [])
            data = await resp.json()

        gene_name = ""
        for gn in data.get("genes", []):
            if gn.get("geneName", {}).get("value"):
                gene_name = gn["geneName"]["value"]
                break

        diseases = []
        for comment in data.get("comments", []):
            if comment.get("commentType") != "DISEASE":
                continue
            disease_info = comment.get("disease")
            if not disease_info:
                continue
            diseases.append({
                "disease_id": disease_info.get("diseaseId", ""),
                "disease_accession": disease_info.get("diseaseAccession", ""),
                "description": (disease_info.get("description", "") or "")[:500],
                "omim_id": (
                    disease_info.get("diseaseCrossReference", {}).get("id", "")
                    if disease_info.get("diseaseCrossReference")
                    else ""
                ),
            })

        return (gene_name, diseases)
    except Exception as exc:
        logger.debug("Failed to fetch %s: %s", uid, exc)
        return ("", [])
