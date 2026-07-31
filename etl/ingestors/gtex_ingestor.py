"""Retrieve measured median tissue expression from the official GTEx API."""
from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

import aiohttp

from ..config import settings
from ..database import COLLECTIONS, batch_upsert, get_db

logger = logging.getLogger(__name__)

DATASET_ID = "gtex_v10"
GENCODE_VERSION = "v39"
GENOME_BUILD = "GRCh38/hg38"
GENE_BATCH_SIZE = 50


def _organ_system(tissue_id: str) -> str:
    value = tissue_id.lower()
    rules = [
        (("brain", "spinal_cord"), "CNS"),
        (("heart", "artery", "aorta"), "Cardiovascular"),
        (("whole_blood", "spleen", "lymphocyte", "bone_marrow"), "Immune"),
        (("lung",), "Respiratory"),
        (("kidney", "bladder"), "Renal"),
        (("liver",), "Hepatic"),
        (("colon", "stomach", "esophagus", "small_intestine"), "Gastrointestinal"),
        (("pancreas", "thyroid", "pituitary", "adrenal"), "Endocrine"),
        (("breast", "ovary", "uterus", "vagina", "testis", "prostate"), "Reproductive"),
        (("muscle",), "Musculoskeletal"),
        (("skin",), "Skin"),
        (("adipose",), "Adipose"),
    ]
    for needles, system in rules:
        if any(needle in value for needle in needles):
            return system
    return "Other"


def _tau(values: list[float]) -> float:
    if len(values) <= 1:
        return 0.0
    maximum = max(values)
    if maximum <= 0:
        return 0.0
    return sum(1.0 - value / maximum for value in values) / (len(values) - 1)


async def _get_json(
    session: aiohttp.ClientSession,
    endpoint: str,
    params: list[tuple[str, str]],
) -> dict[str, Any]:
    url = f"{settings.api.gtex_url.rstrip('/')}/{endpoint}"
    async with session.get(url, params=params) as response:
        response.raise_for_status()
        return await response.json()


async def ingest_expression() -> int:
    logger.info("Starting verified GTEx %s median-expression ingestion", DATASET_ID)
    db = get_db()
    genes = sorted(
        gene
        for gene in await db[COLLECTIONS["kinases"]].distinct("gene_symbol")
        if gene
    )
    if not genes:
        raise RuntimeError("No kinase gene symbols are available for GTEx lookup")

    timeout = aiohttp.ClientTimeout(total=120)
    gencode_by_gene: dict[str, str] = {}
    expression_rows: list[dict[str, Any]] = []

    async with aiohttp.ClientSession(timeout=timeout) as session:
        for offset in range(0, len(genes), GENE_BATCH_SIZE):
            batch = genes[offset : offset + GENE_BATCH_SIZE]
            params = [("geneId", gene) for gene in batch]
            params.extend([
                ("gencodeVersion", GENCODE_VERSION),
                ("genomeBuild", GENOME_BUILD),
                ("itemsPerPage", "1000"),
            ])
            payload = await _get_json(session, "reference/gene", params)
            wanted = set(batch)
            for row in payload.get("data", []):
                symbol = str(row.get("geneSymbol", "")).upper()
                gencode_id = str(row.get("gencodeId", ""))
                if symbol in wanted and gencode_id and symbol not in gencode_by_gene:
                    gencode_by_gene[symbol] = gencode_id
            await asyncio.sleep(1 / max(settings.rate.gtex_rps, 1))

        missing = sorted(set(genes) - set(gencode_by_gene))
        if missing:
            logger.warning("GTEx reference mapping unavailable for %d genes", len(missing))

        gencode_items = list(gencode_by_gene.values())
        for offset in range(0, len(gencode_items), GENE_BATCH_SIZE):
            batch_ids = gencode_items[offset : offset + GENE_BATCH_SIZE]
            params = [("gencodeId", identifier) for identifier in batch_ids]
            params.extend([
                ("datasetId", DATASET_ID),
                ("itemsPerPage", "100000"),
            ])
            payload = await _get_json(session, "expression/medianGeneExpression", params)
            expression_rows.extend(payload.get("data", []))
            await asyncio.sleep(1 / max(settings.rate.gtex_rps, 1))

    if not expression_rows:
        raise RuntimeError("GTEx returned no median-expression records; existing data was not changed")

    by_gene: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in expression_rows:
        symbol = str(row.get("geneSymbol", "")).upper()
        median = row.get("median")
        tissue_id = str(row.get("tissueSiteDetailId", ""))
        if symbol in gencode_by_gene and tissue_id and isinstance(median, (int, float)):
            by_gene[symbol].append(row)

    retrieved_at = datetime.now(timezone.utc)
    records: list[dict[str, Any]] = []
    for gene, rows in by_gene.items():
        values = [float(row["median"]) for row in rows]
        tau = round(_tau(values), 6)
        for row in rows:
            tissue_id = str(row["tissueSiteDetailId"])
            records.append({
                "gene_symbol": gene,
                "gencode_id": str(row.get("gencodeId", gencode_by_gene[gene])),
                "tissue_site": tissue_id.replace("_", " "),
                "tissue_site_id": tissue_id,
                "ontology_id": str(row.get("ontologyId", "")),
                "median_tpm": float(row["median"]),
                "unit": str(row.get("unit", "TPM")),
                "organ_system": _organ_system(tissue_id),
                "tau": tau,
                "dataset_id": str(row.get("datasetId", DATASET_ID)),
                "source": "gtex",
                "source_url": f"{settings.api.gtex_url.rstrip('/')}/expression/medianGeneExpression",
                "retrieved_at": retrieved_at,
            })

    if not records:
        raise RuntimeError("GTEx response contained no valid numeric kinase records")

    await db[COLLECTIONS["expression"]].delete_many({"source": "gtex"})
    await batch_upsert(
        COLLECTIONS["expression"],
        records,
        key_fields=["gene_symbol", "tissue_site_id", "dataset_id"],
        batch_size=1000,
    )
    logger.info(
        "Stored %d verified GTEx measurements for %d/%d kinase symbols",
        len(records), len(by_gene), len(genes),
    )
    return len(records)
