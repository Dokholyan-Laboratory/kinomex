"""Fetch disease annotations from UniProt for all kinases."""
from __future__ import annotations
import asyncio
import logging
import aiohttp
from datetime import datetime, timezone
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

    collected_docs: list[dict] = []
    completed = 0
    sem = asyncio.Semaphore(CONCURRENCY)

    async with aiohttp.ClientSession() as session:
        for i in range(0, len(kinases), BATCH_SIZE):
            batch = [u for u in kinases[i : i + BATCH_SIZE] if u]
            if not batch:
                continue

            async def _limited(uid: str) -> tuple[str, list[dict], bool]:
                async with sem:
                    result = await _fetch_entry(session, uid)
                    await asyncio.sleep(UNIPROT_DELAY)
                    return result

            results = await asyncio.gather(*[_limited(uid) for uid in batch])

            docs = []
            for uid, (gene_name, diseases, succeeded) in zip(batch, results):
                if succeeded:
                    completed += 1
                if diseases:
                    docs.append({
                        "uniprot_id": uid,
                        "gene_symbol": gene_name,
                        "diseases": diseases,
                        "source": "uniprot",
                        "source_url": f"https://rest.uniprot.org/uniprotkb/{uid}",
                        "retrieved_at": datetime.now(timezone.utc),
                    })

            if docs:
                collected_docs.extend(docs)

            if (i // BATCH_SIZE) % 20 == 0:
                logger.info(
                    "Diseases progress: %d/%d kinases, %d with diseases",
                    i + len(batch), len(kinases), len(collected_docs),
                )

    if completed != len(kinases):
        raise RuntimeError(f"UniProt disease refresh incomplete: {completed}/{len(kinases)} requests succeeded")
    await diseases_col.delete_many({"source": {"$in": ["uniprot", None]}})
    if collected_docs:
        await diseases_col.insert_many(collected_docs, ordered=False)
    final_count = await diseases_col.count_documents({})
    logger.info("Diseases complete: %d kinases with disease annotations", final_count)


async def _fetch_entry(
    session: aiohttp.ClientSession,
    uid: str,
) -> tuple[str, list[dict], bool]:
    """Fetch a single UniProt entry and extract disease annotations."""
    url = f"https://rest.uniprot.org/uniprotkb/{uid}.json"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                return ("", [], False)
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

        return (gene_name, diseases, True)
    except Exception as exc:
        logger.debug("Failed to fetch %s: %s", uid, exc)
        return ("", [], False)
