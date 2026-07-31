"""Ensure canonical kinase metadata exists without inventing scientific data."""
import asyncio
import logging
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from etl.database import COLLECTIONS, connect, disconnect, get_db
from etl.pipeline import run_pipeline
from etl.kinase_groups import KINASE_GROUPS

_UNIPROT_ACC_RE = re.compile(r"^[OPQ][0-9][A-Z0-9]{3}[0-9]$|^[A-NR-Z][0-9][A-Z][A-Z0-9]{2}[0-9]$")

def _entry_score(doc: dict) -> float:
    name = doc.get("full_name", "") or ""
    seq = doc.get("protein_sequence") or ""
    seq_len = doc.get("seq_length") or len(seq)

    reviewed = doc.get("reviewed", False)
    has_seq = bool(seq) and seq_len > 50
    name_starts_upper = name and name[0].isupper()

    return (
        (15.0 if reviewed else -5.0)
        + (3.0 if has_seq else -3.0)
        + (2.0 if name_starts_upper else 0.0)
        + (min(seq_len, 5000) / 500.0)
    )


async def dedup_kinases(db) -> int:
    pipeline = [
        {"$group": {"_id": "$gene_symbol", "ids": {"$push": "$_id"}, "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}},
    ]
    dupes = await db[COLLECTIONS["kinases"]].aggregate(pipeline).to_list(length=2000)
    total_removed = 0
    for group in dupes:
        gene = group["_id"]
        if not gene:
            continue
        docs = await db[COLLECTIONS["kinases"]].find({"gene_symbol": gene}).to_list(length=100)
        docs.sort(key=_entry_score, reverse=True)
        keep = docs[0]
        to_remove = [d["_id"] for d in docs[1:]]
        if to_remove:
            result = await db[COLLECTIONS["kinases"]].delete_many({"_id": {"$in": to_remove}})
            total_removed += result.deleted_count
    return total_removed

async def cleanup_kinases(db) -> int:
    """Remove entries without a valid gene_symbol (empty or uniprot accession used as symbol)."""
    total = 0
    # Remove empty gene_symbol
    result = await db[COLLECTIONS["kinases"]].delete_many(
        {"$or": [{"gene_symbol": ""}, {"gene_symbol": None}]}
    )
    total += result.deleted_count
    # Remove entries where gene_symbol looks like a UniProt accession (no real gene name found)
    cursor = db[COLLECTIONS["kinases"]].aggregate([
        {"$match": {"gene_symbol": {"$ne": ""}}},
        {"$project": {"gene_symbol": 1, "uniprot_id": 1}},
    ])
    to_remove = []
    async for doc in cursor:
        gs = doc.get("gene_symbol") or ""
        uid = doc.get("uniprot_id") or ""
        if gs == uid or _UNIPROT_ACC_RE.match(gs):
            to_remove.append(doc["_id"])
    if to_remove:
        result = await db[COLLECTIONS["kinases"]].delete_many({"_id": {"$in": to_remove}})
        total += result.deleted_count
    return total


async def trim_kinases(db) -> int:
    """Remove Atypical entries not in Manning + fusions, fragments, metabolic enzymes."""
    total = 0
    # Atypical entries not in Manning
    result = await db[COLLECTIONS["kinases"]].delete_many({
        "group": "Atypical",
        "gene_symbol": {"$nin": list(KINASE_GROUPS.keys())},
    })
    total += result.deleted_count
    # Entries with non-standard gene_symbols (fusions, fragments, isoforms)
    result = await db[COLLECTIONS["kinases"]].delete_many({
        "gene_symbol": {"$regex": r"[\s/;:()]|fusion|Fusion|DKFZp|HEL-S|H_YH|MNB/|Par1b|Pe1Fe|Pe7Fe|MST094|KIN27|PCTK[13]$|^dik$|^lsk$|^urf-ret$"}
    })
    total += result.deleted_count
    # Metabolic enzymes
    result = await db[COLLECTIONS["kinases"]].delete_many({
        "gene_symbol": {"$in": ["HK1", "HK2", "HK3", "GCK", "PFKL", "PFKM", "PFKP", "PKLR", "PKM", "PKM2", "MVK", "PMVK", "SEPHS2", "SGMS2", "GNE", "CHKA"]}
    })
    total += result.deleted_count
    return total


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("kinomex.auto_populate")


async def main() -> None:
    await connect()
    db = get_db()
    kinase_count = await db.kinases.count_documents({})

    if kinase_count == 0:
        logger.info("Database empty — seeding kinase metadata from UniProt...")
        await disconnect()
        await run_pipeline(step_names=["uniprot"])
        await connect()
        db = get_db()

    removed = await dedup_kinases(db)
    if removed:
        logger.info("Removed %d duplicate kinase entries (kept best per gene_symbol)", removed)

    cleaned = await cleanup_kinases(db)
    if cleaned:
        logger.info("Removed %d entries without valid gene_symbol", cleaned)

    trimmed = await trim_kinases(db)
    if trimmed:
        logger.info("Removed %d non-canonical Atypical entries (metabolic kinases, AKAPs, etc.)", trimmed)

    scientific_collections = [
        "bioactivities", "variants", "diseases", "expression", "pdis", "structures"
    ]
    coll_counts = {
        name: await db[name].count_documents({}) for name in scientific_collections
    }
    missing = [name for name, count in coll_counts.items() if count == 0]
    if missing:
        logger.warning(
            "Verified data absent from collections: %s. Run `python -m etl.pipeline` "
            "to retrieve authoritative records; synthetic fallback data is disabled.",
            ", ".join(missing),
        )
    else:
        logger.info("All scientific collections contain data; no startup writes needed")

    await disconnect()


if __name__ == "__main__":
    asyncio.run(main())
