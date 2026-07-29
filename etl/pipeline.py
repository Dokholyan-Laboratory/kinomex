from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import time
from typing import Sequence

from .config import settings
from .database import connect, disconnect, ensure_indexes

logger = logging.getLogger("kinomex.etl")


# ---------------------------------------------------------------------------
# Step definitions
# ---------------------------------------------------------------------------

STEPS = [
    ("uniprot", "UniProt kinase metadata"),
    ("pdb", "RCSB PDB structural data"),
    ("chembl", "ChEMBL bioactivity data"),
    ("pubchem", "PubChem compound enrichment & Ambit dataset"),
    ("gtex", "GTEx tissue expression"),
    ("clinvar", "ClinVar pathogenic variants"),
    ("diseases", "UniProt disease annotations"),
    ("pdis", "PDIS pharmaceutical interest scores"),
]

STEP_DEPENDENCIES: dict[str, list[str]] = {
    "pdb": ["uniprot"],
    "chembl": ["uniprot"],
    "pubchem": ["uniprot", "chembl"],
    "gtex": ["uniprot"],
    "clinvar": ["uniprot"],
    "diseases": ["uniprot"],
    "pdis": ["uniprot", "pdb", "chembl", "gtex", "clinvar", "diseases"],
}


def _resolve_order(requested: list[str]) -> list[str]:
    """Topological sort of requested steps respecting dependencies."""
    resolved: list[str] = []
    visited: set[str] = set()

    def _visit(step: str) -> None:
        if step in visited:
            return
        visited.add(step)
        for dep in STEP_DEPENDENCIES.get(step, []):
            if dep in [s for s, _ in STEPS]:
                _visit(dep)
        resolved.append(step)

    for step_name, _ in STEPS:
        if step_name in requested:
            _visit(step_name)

    return [s for s in resolved if s in requested]


# ---------------------------------------------------------------------------
# Individual step runners
# ---------------------------------------------------------------------------

async def _run_uniprot() -> int:
    from .ingestors.uniprot_ingestor import ingest_kinases
    return await ingest_kinases()


async def _run_pdb() -> int:
    from .ingestors.pdb_ingestor import ingest_structures
    return await ingest_structures()


async def _run_chembl() -> int:
    from .ingestors.chembl_ingestor import ingest_bioactivities
    return await ingest_bioactivities()


async def _run_pubchem() -> int:
    from .ingestors.pubchem_ingestor import ingest_pubchem
    result = await ingest_pubchem()
    total = sum(result.values())
    logger.info("PubChem step results: %s", result)
    return total


async def _run_gtex() -> int:
    from .ingestors.gtex_ingestor import ingest_expression
    return await ingest_expression()


async def _run_clinvar() -> int:
    from .ingestors.clinvar_ingestor import ingest_variants
    return await ingest_variants()


async def _run_pdis() -> int:
    from .ingestors.pdis_calculator import ingest_pdis
    return await ingest_pdis()


async def _run_diseases() -> int:
    from .ingestors.disease_ingestor import fetch_diseases
    from .database import get_db
    db = get_db()
    await fetch_diseases(db)
    return await db.diseases.count_documents({})


STEP_RUNNERS = {
    "uniprot": _run_uniprot,
    "pdb": _run_pdb,
    "chembl": _run_chembl,
    "pubchem": _run_pubchem,
    "gtex": _run_gtex,
    "clinvar": _run_clinvar,
    "diseases": _run_diseases,
    "pdis": _run_pdis,
}


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

async def run_pipeline(step_names: list[str] | None = None) -> dict[str, Any]:
    """Run the ETL pipeline.

    Args:
        step_names: Subset of steps to run.  ``None`` means run all.

    Returns:
        Dictionary with per-step record counts and timing.
    """
    if step_names is None:
        step_names = [name for name, _ in STEPS]

    ordered = _resolve_order(step_names)
    if not ordered:
        logger.warning("No valid steps selected – nothing to do")
        return {}

    logger.info("Pipeline steps to execute: %s", " → ".join(ordered))

    await connect()
    await ensure_indexes()

    results: dict[str, Any] = {}
    t_total = time.perf_counter()

    for step_name in ordered:
        label = dict(STEPS).get(step_name, step_name)
        logger.info("=" * 60)
        logger.info("STEP: %s – %s", step_name.upper(), label)
        logger.info("=" * 60)
        t0 = time.perf_counter()
        try:
            count = await STEP_RUNNERS[step_name]()
            elapsed = time.perf_counter() - t0
            results[step_name] = {"records": count, "elapsed_s": round(elapsed, 2), "status": "ok"}
            logger.info("✓ %s completed – %d records in %.1fs", step_name, count, elapsed)
        except Exception as exc:
            elapsed = time.perf_counter() - t0
            results[step_name] = {"records": 0, "elapsed_s": round(elapsed, 2), "status": "failed", "error": str(exc)}
            logger.error("✗ %s failed after %.1fs: %s", step_name, elapsed, exc, exc_info=True)

    await disconnect()

    total_elapsed = time.perf_counter() - t_total
    results["_total"] = {
        "elapsed_s": round(total_elapsed, 2),
        "total_records": sum(r.get("records", 0) for r in results.values() if isinstance(r, dict)),
    }

    logger.info("=" * 60)
    logger.info("PIPELINE COMPLETE – %d total records in %.1fs", results["_total"]["total_records"], total_elapsed)
    for step, info in results.items():
        if step.startswith("_"):
            continue
        status = "✓" if info["status"] == "ok" else "✗"
        logger.info("  %s %-12s %6d records  %7.1fs", status, step, info["records"], info["elapsed_s"])
    logger.info("=" * 60)

    return results


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="kinomex-etl",
        description="KinomeX ETL pipeline – fetch & store bioinformatics data",
    )
    parser.add_argument(
        "steps",
        nargs="*",
        choices=[name for name, _ in STEPS],
        help="Steps to run (default: all).  Steps are auto-resolved with dependencies.",
    )
    parser.add_argument(
        "--log-level",
        default=settings.log.level,
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        help="Logging verbosity (default: INFO)",
    )
    parser.add_argument(
        "--list-steps",
        action="store_true",
        help="List available steps and exit",
    )
    args = parser.parse_args()

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format=settings.log.fmt,
        datefmt=settings.log.datefmt,
        stream=sys.stdout,
    )

    if args.list_steps:
        print("Available pipeline steps:")
        for name, desc in STEPS:
            deps = STEP_DEPENDENCIES.get(name, [])
            dep_str = f" (depends on: {', '.join(deps)})" if deps else ""
            print(f"  {name:12s}  {desc}{dep_str}")
        sys.exit(0)

    steps_to_run = args.steps if args.steps else None
    results = asyncio.run(run_pipeline(steps_to_run))

    # Exit with error if any step failed
    failed = [k for k, v in results.items() if isinstance(v, dict) and v.get("status") == "failed"]
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
