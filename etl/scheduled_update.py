"""Run a concurrency-safe, auditable refresh of KinomeX source data."""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from .database import connect, disconnect, get_db
from .pipeline import STEPS, run_pipeline

JOB_ID = "scheduled-source-refresh"
STATE_COLLECTION = "etl_runs"
logger = logging.getLogger("kinomex.scheduled_update")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _acquire_lease(lease_minutes: int) -> str | None:
    """Acquire a MongoDB lease, returning its unique token or ``None``."""
    token = str(uuid.uuid4())
    now = _utcnow()
    db = await connect()
    try:
        document = await db[STATE_COLLECTION].find_one_and_update(
            {
                "_id": JOB_ID,
                "$or": [
                    {"locked_until": {"$lte": now}},
                    {"locked_until": {"$exists": False}},
                ],
            },
            {
                "$set": {
                    "lease_token": token,
                    "locked_until": now + timedelta(minutes=lease_minutes),
                    "started_at": now,
                    "status": "running",
                },
                "$setOnInsert": {"created_at": now},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return token if document and document.get("lease_token") == token else None
    except DuplicateKeyError:
        # The singleton job document exists but its active lease did not match.
        return None
    finally:
        await disconnect()


async def _finish_run(
    token: str,
    status: str,
    results: dict[str, Any],
    error: str | None = None,
) -> None:
    now = _utcnow()
    db = await connect()
    try:
        summary = {
            "started_at": results.pop("_started_at", None),
            "finished_at": now,
            "status": status,
            "steps": results,
        }
        if error:
            summary["error"] = error

        await db[STATE_COLLECTION].update_one(
            {"_id": JOB_ID, "lease_token": token},
            {
                "$set": {
                    "status": status,
                    "finished_at": now,
                    "last_results": results,
                    "last_error": error,
                    "locked_until": now,
                },
                "$unset": {"lease_token": ""},
                "$push": {"history": {"$each": [summary], "$slice": -20}},
            },
        )
    finally:
        await disconnect()


async def scheduled_refresh(step_names: list[str] | None, lease_minutes: int) -> int:
    token = await _acquire_lease(lease_minutes)
    if token is None:
        logger.info("Another source refresh is already running; this run is skipped")
        return 0

    started_at = _utcnow()
    results: dict[str, Any] = {"_started_at": started_at}
    try:
        pipeline_results = await run_pipeline(step_names)
        results.update(pipeline_results)
        failed = [
            name
            for name, result in pipeline_results.items()
            if not name.startswith("_") and result.get("status") == "failed"
        ]
        status = "failed" if failed else "succeeded"
        await _finish_run(token, status, results)
        print(json.dumps(pipeline_results, indent=2, default=str))
        if failed:
            logger.error("Source refresh failed in steps: %s", ", ".join(failed))
            return 1
        return 0
    except Exception as exc:
        logger.exception("Scheduled source refresh aborted")
        try:
            await _finish_run(token, "failed", results, str(exc))
        except Exception:
            logger.exception("Could not record scheduled refresh failure")
        return 1


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Refresh KinomeX from its upstream data sources safely"
    )
    parser.add_argument(
        "steps",
        nargs="*",
        choices=[name for name, _ in STEPS],
        help="Target steps; prerequisites are included automatically (default: all)",
    )
    parser.add_argument(
        "--lease-minutes",
        type=int,
        default=360,
        help="Maximum overlap-protection lease duration (default: 360)",
    )
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
    )
    args = parser.parse_args()
    if args.lease_minutes < 15 or args.lease_minutes > 1440:
        parser.error("--lease-minutes must be between 15 and 1440")

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
    )
    raise SystemExit(asyncio.run(scheduled_refresh(args.steps or None, args.lease_minutes)))


if __name__ == "__main__":
    main()
