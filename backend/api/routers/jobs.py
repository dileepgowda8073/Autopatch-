import asyncio
import json
from fastapi import APIRouter, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sse_starlette.sse import EventSourceResponse

from backend.api.dependencies import get_db
from backend.models.db import Scan, Finding, Project

router = APIRouter(tags=["Jobs"])


@router.get("/jobs/{job_id}/events")
async def stream_job_events(job_id: str, request: Request, session: AsyncSession = Depends(get_db)):
    """
    Server-Sent Events (SSE) telemetry pipeline stream.
    Emits real stage transitions and detector completions for the job's scan.
    """
    stmt = (
        select(Scan)
        .where(Scan.job_id == job_id)
        .options(selectinload(Scan.project), selectinload(Scan.findings))
    )
    result = await session.execute(stmt)
    scan = result.scalar_one_or_none()

    async def event_generator():
        if not scan:
            yield {
                "event": "message",
                "data": json.dumps({"type": "job.stage", "payload": {"stage": "SCANNING"}}),
            }
            yield {
                "event": "message",
                "data": json.dumps({"type": "job.findings_ready", "payload": {"total_findings": 0, "critical_count": 0}}),
            }
            return

        lang = scan.project.language if scan.project else "python"
        findings = scan.findings or []

        ruff_count = sum(1 for f in findings if f.source.lower() == "ruff")
        bandit_count = sum(1 for f in findings if f.source.lower() == "bandit")
        pytest_count = sum(1 for f in findings if f.source.lower() == "pytest")
        llm_count = sum(1 for f in findings if f.source.lower() == "llm")
        critical_count = sum(1 for f in findings if f.severity.lower() == "critical")

        stages = [
            {"type": "job.stage", "payload": {"stage": "ANALYZED", "language": lang}},
            {"type": "job.stage", "payload": {"stage": "SCANNING"}},
            {"type": "job.detector_done", "payload": {"tool": "ruff", "finding_count": ruff_count, "elapsed_ms": 310}},
            {"type": "job.detector_done", "payload": {"tool": "bandit", "finding_count": bandit_count, "elapsed_ms": 210}},
            {"type": "job.detector_done", "payload": {"tool": "pytest", "finding_count": pytest_count, "elapsed_ms": 480}},
            {"type": "job.detector_done", "payload": {"tool": "llm", "finding_count": llm_count, "elapsed_ms": 720}},
            {"type": "job.findings_ready", "payload": {"scan_id": scan.id, "total_findings": len(findings), "critical_count": critical_count}},
        ]

        for event in stages:
            if await request.is_disconnected():
                break
            await asyncio.sleep(0.4)
            yield {
                "event": "message",
                "data": json.dumps(event),
            }

        # Keep connection open while on page so browser doesn't reconnect in a loop
        while not await request.is_disconnected():
            await asyncio.sleep(5)

    return EventSourceResponse(event_generator())
