from __future__ import annotations

import logging
from typing import Any, Sequence

import motor.motor_asyncio
from pymongo import ASCENDING, DESCENDING, IndexModel, UpdateOne

from .config import settings

logger = logging.getLogger(__name__)

_client: motor.motor_asyncio.AsyncIOMotorClient | None = None
_db: motor.motor_asyncio.AsyncIOMotorDatabase | None = None

COLLECTIONS = {
    "kinases": "kinases",
    "structures": "structures",
    "bioactivities": "bioactivities",
    "expression": "expression",
    "variants": "variants",
    "pdis": "pdis",
    "diseases": "diseases",
}


# ---------------------------------------------------------------------------
# Connection helpers
# ---------------------------------------------------------------------------

async def connect() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    global _client, _db
    if _db is not None:
        return _db
    cfg = settings.db
    logger.info("Connecting to MongoDB at %s", cfg.uri)
    _client = motor.motor_asyncio.AsyncIOMotorClient(
        cfg.uri,
        maxPoolSize=cfg.max_pool_size,
        minPoolSize=cfg.min_pool_size,
        serverSelectionTimeoutMS=cfg.server_selection_timeout_ms,
    )
    await _client.admin.command("ping")
    _db = _client[cfg.db_name]
    logger.info("Connected to database '%s'", cfg.db_name)
    return _db


async def disconnect() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
        logger.info("Disconnected from MongoDB")


def get_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not connected – call connect() first")
    return _db


# ---------------------------------------------------------------------------
# Index initialisation
# ---------------------------------------------------------------------------

async def ensure_indexes() -> None:
    db = get_db()

    await db[COLLECTIONS["kinases"]].create_indexes([
        IndexModel([("uniprot_id", ASCENDING)], unique=True),
        IndexModel([("gene_symbol", ASCENDING)]),
        IndexModel([("ec_number", ASCENDING)]),
    ])

    await db[COLLECTIONS["structures"]].create_indexes([
        IndexModel([("pdb_id", ASCENDING)], unique=True),
        IndexModel([("gene_symbols", ASCENDING)]),
        IndexModel([("resolution", ASCENDING)]),
    ])

    await db[COLLECTIONS["bioactivities"]].create_indexes([
        IndexModel([("compound_id", ASCENDING), ("target_chembl_id", ASCENDING)]),
        IndexModel([("target_gene_symbol", ASCENDING)]),
        IndexModel([("pubchem_cid", ASCENDING)]),
        IndexModel([("assay_type", ASCENDING)]),
        IndexModel([("standard_value", ASCENDING)]),
    ])

    await db[COLLECTIONS["expression"]].create_indexes([
        IndexModel([("gene_symbol", ASCENDING), ("tissue_site", ASCENDING)], unique=True),
        IndexModel([("gene_symbol", ASCENDING)]),
        IndexModel([("tau", DESCENDING)]),
    ])

    await db[COLLECTIONS["variants"]].create_indexes([
        IndexModel([("uniprot_id", ASCENDING), ("mutation_code", ASCENDING)]),
        IndexModel([("gene_symbol", ASCENDING)]),
        IndexModel([("pathogenicity", ASCENDING)]),
    ])

    await db[COLLECTIONS["pdis"]].create_indexes([
        IndexModel([("gene_symbol", ASCENDING)], unique=True),
        IndexModel([("pdis_total", DESCENDING)]),
    ])

    logger.info("All indexes ensured")


# ---------------------------------------------------------------------------
# Batch upsert
# ---------------------------------------------------------------------------

async def batch_upsert(
    collection_name: str,
    documents: list[dict[str, Any]],
    key_fields: list[str],
    batch_size: int = 500,
) -> int:
    """Upsert *documents* into *collection_name* matching on *key_fields*.

    Returns the total number of matched (existing) documents.
    """
    if not documents:
        return 0

    db = get_db()
    coll = db[collection_name]
    matched = 0

    for i in range(0, len(documents), batch_size):
        batch = documents[i : i + batch_size]
        bulk_ops = []
        for doc in batch:
            filter_query = {k: doc[k] for k in key_fields if k in doc}
            bulk_ops.append(
                UpdateOne(
                    filter_query,
                    {"$set": doc},
                    upsert=True,
                )
            )
        result = await coll.bulk_write(bulk_ops, ordered=False)
        matched += result.matched_count

    logger.debug(
        "Upserted %d docs into %s (matched %d existing)",
        len(documents),
        collection_name,
        matched,
    )
    return matched
