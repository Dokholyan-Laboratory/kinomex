from __future__ import annotations

import asyncio
import logging
from typing import Any

import aiohttp

from ..config import settings
from ..database import COLLECTIONS, batch_upsert
from ..kinase_groups import KINASE_GROUPS

logger = logging.getLogger(__name__)

KINASE_QUERY = "organism_id:9606 AND keyword:KW-0418"
UNIPROT_SEARCH = "/uniprotkb/search"


def _extract_kinase(record: dict[str, Any]) -> dict[str, Any]:
    """Normalise a single UniProt JSON record into our schema."""
    uniprot_id = record.get("primaryAccession", "")
    genes = record.get("genes", [])
    gene_symbol = ""
    if genes:
        gene_symbol = genes[0].get("geneName", {}).get("value", "")
        if not gene_symbol:
            # Fallback to orderedLocusNames
            ol = genes[0].get("orderedLocusNames", [])
            if ol:
                gene_symbol = ol[0].get("value", "")
    # Fallback: extract from uniProtkbId (e.g. "RIPK2_HUMAN" -> "RIPK2")
    if not gene_symbol:
        uid = record.get("uniProtkbId", "")
        if "_" in uid:
            gene_symbol = uid.split("_")[0]

    protein_name = record.get("proteinDescription", {})
    rec_name = protein_name.get("recommendedName", {})
    full_name = rec_name.get("fullName", {}).get("value", "") if rec_name else ""

    ec_numbers = []
    if rec_name:
        for ec in rec_name.get("ecNumbers", []):
            ec_numbers.append(ec.get("value", ""))

    seq_info = record.get("sequence", {})
    protein_sequence = seq_info.get("value", "")
    seq_length = seq_info.get("length", 0)

    domains: list[dict[str, Any]] = []
    for feat in record.get("features", []):
        if feat.get("type") == "Domain":
            loc = feat.get("location", {})
            start = loc.get("start", {}).get("value", 0)
            end = loc.get("end", {}).get("value", 0)
            domains.append({"name": feat.get("description", "unknown"), "start": start, "end": end})

    keywords: list[str] = []
    for kw in record.get("keywords", []):
        keywords.append(kw.get("name", ""))

    # Derive kinase group from curated mapping, fallback to keyword heuristic
    group = KINASE_GROUPS.get(gene_symbol, _derive_group(keywords, full_name))

    return {
        "uniprot_id": uniprot_id,
        "gene_symbol": gene_symbol,
        "full_name": full_name,
        "ec_number": ec_numbers[0] if ec_numbers else "",
        "ec_numbers": ec_numbers,
        "protein_sequence": protein_sequence,
        "seq_length": seq_length,
        "domain_boundaries": domains,
        "keywords": keywords,
        "group": group,
        "source": "uniprot",
    }


def _derive_group(keywords: list[str], full_name: str) -> str:
    """Derive Manning kinase group from UniProt keywords and protein name."""
    kw_lower = [k.lower() for k in keywords]
    name_lower = full_name.lower()

    if "tyrosine-protein kinase" in name_lower:
        return "TK"
    if any("tyrosine-protein kinase" in k for k in kw_lower):
        return "TK"

    if any("tyrosine kinase-like" in k for k in kw_lower):
        return "TKL"

    if any("cmgc" in k for k in kw_lower):
        return "CMGC"

    if any("camk" in k for k in kw_lower) or any("calcium/calmodulin" in k for k in kw_lower):
        return "CAMK"

    if any("agc" in k for k in kw_lower) or any("pkc" in name_lower for _ in [0]):
        return "AGC"

    if any("ck1" in k for k in kw_lower) or any("casein kinase" in k for k in kw_lower):
        return "CK1"

    if any("ste" in k for k in kw_lower) or any("map kinase" in k for k in kw_lower):
        return "STE"

    if "serine/threonine-protein kinase" in name_lower or any("serine/threonine-protein kinase" in k for k in kw_lower):
        return "CMGC"

    if "kinase" in name_lower or "kinase" in " ".join(kw_lower):
        return "Atypical"

    return "Atypical"


def _parse_link_header(link_header: str) -> str | None:
    """Extract cursor URL from Link header."""
    if not link_header:
        return None
    for part in link_header.split(","):
        part = part.strip()
        if 'rel="next"' in part:
            url = part.split(";")[0].strip().strip("<>")
            return url
    return None


async def ingest_kinases() -> int:
    """Fetch all human kinase entries from UniProt and store in MongoDB."""
    logger.info("Starting UniProt kinase ingestion")
    sem = asyncio.Semaphore(settings.rate.uniprot_rps)
    base = settings.api.uniprot_url
    size = settings.rate.uniprot_batch_size

    all_records: list[dict[str, Any]] = []
    total = 0

    async with aiohttp.ClientSession() as session:
        # First request
        params: dict[str, Any] = {"query": KINASE_QUERY, "format": "json", "size": size}

        async with sem:
            await asyncio.sleep(1 / settings.rate.uniprot_rps)
            async with session.get(f"{base}{UNIPROT_SEARCH}", params=params) as resp:
                resp.raise_for_status()
                total = int(resp.headers.get("X-Total-Results", 0))
                link_header = resp.headers.get("Link", "")
                data = await resp.json()

        logger.info("UniProt reports %d human kinase entries", total)

        results = data.get("results", [])
        all_records.extend(_extract_kinase(r) for r in results)
        logger.info("Fetched page 1: %d records (total so far: %d)", len(results), len(all_records))

        # Get next cursor from Link header (from HTTP headers, not JSON body)
        next_url = _parse_link_header(link_header)

        page_num = 1
        while next_url:
            page_num += 1
            async with sem:
                await asyncio.sleep(1 / settings.rate.uniprot_rps)
                async with session.get(next_url) as resp:
                    resp.raise_for_status()
                    link_header = resp.headers.get("Link", "")
                    data = await resp.json()

            results = data.get("results", [])
            all_records.extend(_extract_kinase(r) for r in results)
            logger.info("Fetched page %d: %d records (total so far: %d)", page_num, len(results), len(all_records))

            next_url = _parse_link_header(link_header)

            if not results:
                break

    # Persist
    if all_records:
        await batch_upsert(
            COLLECTIONS["kinases"],
            all_records,
            key_fields=["uniprot_id"],
            batch_size=settings.rate.uniprot_batch_size,
        )
    logger.info("UniProt ingestion complete – %d kinase records stored", len(all_records))
    return len(all_records)
