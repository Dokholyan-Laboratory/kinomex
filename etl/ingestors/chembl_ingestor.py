from __future__ import annotations

import asyncio
import logging
from typing import Any

import aiohttp

from ..config import settings
from ..database import COLLECTIONS, batch_upsert, get_db

logger = logging.getLogger(__name__)

BINDING_TYPE_KEYWORDS: dict[str, list[str]] = {
    "Type I": ["type i ", "type-i", "type i inhibitor", "active site"],
    "Type II": ["type ii", "type-ii", "dfg-out", "inactive conformation"],
    "Type III": ["type iii", "type-iii", "allosteric"],
    "Covalent": ["covalent", "irreversible"],
    "PROTAC": ["protac", "degrader", "bifunctional"],
}


def _collect_pubmed_ids(record: dict[str, Any]) -> list[str]:
    """Collect PMIDs from various possible fields in the ChEMBL response."""
    pids: list[str] = []
    for field in ["pubmed_id", "document_pubmed_id"]:
        val = record.get(field)
        if val:
            parts = str(val).split(";") if ";" in str(val) else [str(val)]
            pids.extend(p.strip() for p in parts if p.strip())
    return pids


def _classify_binding_type(text: str) -> str:
    text_lower = text.lower()
    for btype, keywords in BINDING_TYPE_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return btype
    return "Orthosteric Type I"


def _extract_bioactivity(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "compound_id": record.get("molecule_chembl_id", ""),
        "compound_name": record.get("molecule_pref_name") or "",
        "canonical_smiles": record.get("canonical_smiles", ""),
        "assay_type": (record.get("standard_type") or "").upper(),
        "standard_value": record.get("standard_value"),
        "standard_units": record.get("standard_units", ""),
        "standard_relation": record.get("standard_relation", "="),
        "target_chembl_id": record.get("target_chembl_id", ""),
        "target_organism": record.get("target_organism", ""),
        "target_pref_name": record.get("target_pref_name", ""),
        "binding_type": _classify_binding_type(record.get("assay_description", "") or ""),
        "pubmed_ids": _collect_pubmed_ids(record),
        "doi": record.get("doi", ""),
        "pchembl_value": record.get("pchembl_value"),
        "assay_chembl_id": record.get("assay_chembl_id", ""),
        "document_journal": record.get("document_journal", ""),
        "document_year": record.get("document_year"),
        "pubchem_cid": None,
        "source": "chembl",
    }


async def ingest_bioactivities() -> int:
    """Fetch bioactivity data from ChEMBL for human kinase targets.

    Strategy: Use ChEMBL's activity API with organism filter and paginate once.
    """
    logger.info("Starting ChEMBL bioactivity ingestion")
    sem = asyncio.Semaphore(settings.rate.chembl_rps)
    base = settings.api.chembl_url

    # Get known UniProt IDs from DB to match targets
    db = get_db()
    known_uniprots: set[str] = set()
    async for doc in db[COLLECTIONS["kinases"]].find({}, {"uniprot_id": 1, "_id": 0}):
        uid = doc.get("uniprot_id", "")
        if uid:
            known_uniprots.add(uid)

    logger.info("Known UniProt IDs for matching: %d", len(known_uniprots))

    all_activities: list[dict[str, Any]] = []
    offset = 0
    size = settings.rate.chembl_batch_size
    max_records = 50000  # Cap to keep runtime reasonable

    async with aiohttp.ClientSession() as session:
        while offset < max_records:
            params = {
                "target_organism": "Homo sapiens",
                "assay_type": "B",
                "limit": size,
                "offset": offset,
                "format": "json",
            }
            try:
                async with sem:
                    await asyncio.sleep(1 / settings.rate.chembl_rps)
                    async with session.get(f"{base}/activity.json", params=params) as resp:
                        resp.raise_for_status()
                        data = await resp.json()
            except Exception as exc:
                logger.warning("ChEMBL fetch failed at offset %d: %s", offset, exc)
                break

            activities = data.get("activities", [])
            if not activities:
                break

            for act in activities:
                all_activities.append(_extract_bioactivity(act))

            page_count = data.get("page_count", 0)
            offset += size
            if offset >= page_count * size:
                # Fetch next page
                pass

            logger.info("Fetched %d ChEMBL activities so far", len(all_activities))

            if len(activities) < size:
                break

    if all_activities:
        await batch_upsert(
            COLLECTIONS["bioactivities"],
            all_activities,
            key_fields=["compound_id", "assay_chembl_id"],
            batch_size=settings.rate.chembl_batch_size,
        )

    # Remove exact duplicates (same compound_id + target_chembl_id duplicates from different assays)
    db = get_db()
    coll = db[COLLECTIONS["bioactivities"]]
    pipeline = [
        {"$group": {"_id": {"compound_id": "$compound_id", "target_chembl_id": "$target_chembl_id"}, "first": {"$first": "$_id"}, "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    dupes = await coll.aggregate(pipeline).to_list(None)
    removed = 0
    for d in dupes:
        result = await coll.delete_one({"_id": d["first"]})
        removed += result.deleted_count
    if removed:
        logger.info("Removed %d exact duplicates from bioactivities", removed)

    logger.info("ChEMBL ingestion complete – %d bioactivity records stored", len(all_activities))
    return len(all_activities)
