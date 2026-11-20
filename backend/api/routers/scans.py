import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.api.dependencies import get_db
from backend.models.db import Project, Scan, Finding
from backend.schemas.scan import ScanStartResponse
from backend.schemas.finding import FindingsListOut, FindingOut
from pathlib import Path
from backend.services.detector.engine import detection_engine

router = APIRouter(tags=["Scans"])


@router.post("/projects/{project_id}/scan", response_model=ScanStartResponse, status_code=status.HTTP_202_ACCEPTED)
@router.post("/projects/{project_id}/scans", response_model=ScanStartResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_scan(
    project_id: str,
    session: AsyncSession = Depends(get_db),
):
    """
    Launch bug detection across 3 signal sources:
      1. Static Linters (Ruff, Bandit / SpotBugs, Checkstyle)
      2. Automated Test Execution (pytest / JUnit)
      3. AI Heuristics Analysis
    """
    stmt = select(Project).where(Project.id == project_id)
    project = (await session.execute(stmt)).scalar_one_or_none()
    if not project:
        raise NotFoundError("Project", project_id)

    scan_id = str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    scan = Scan(
        id=scan_id,
        project_id=project_id,
        job_id=job_id,
        status="SCANNING",
        tool_versions={
            "ruff": "0.4.8",
            "bandit": "1.7.8",
            "pytest": "8.2.0",
            "llm": "gemini-1.5-pro",
        },
    )

    session.add(scan)
    await session.commit()

    # Run detection engine across signal sources
    workspace_path = Path(project.root_path)
    detected_findings = await detection_engine.run_detection(workspace_path, project.language)

    for df in detected_findings:
        finding = Finding(
            id=str(uuid.uuid4()),
            scan_id=scan_id,
            file=df.file,
            line_start=df.line_start,
            line_end=df.line_end,
            title=df.title,
            description=df.description,
            trigger=df.trigger,
            repro_input=df.repro_input,
            expected=df.expected,
            actual=df.actual,
            root_cause=df.root_cause,
            source=df.source.value if hasattr(df.source, "value") else str(df.source),
            severity=df.severity.value if hasattr(df.severity, "value") else str(df.severity),
            severity_reason=df.severity_reason,
            confidence_estimate=df.confidence_estimate,
            is_candidate=df.is_candidate,
            status="open",
        )
        session.add(finding)

    scan.status = "FINDINGS_READY"
    await session.commit()

    return ScanStartResponse(
        id=scan_id,
        job_id=job_id,
        scan_id=scan_id,
        status="QUEUED",
        stream_url=f"/api/v1/jobs/{job_id}/events",
    )


@router.get("/scans/{scan_id}/findings", response_model=FindingsListOut)
async def get_scan_findings(
    scan_id: str,
    severity: str | None = None,
    source: str | None = None,
    session: AsyncSession = Depends(get_db),
):
    """Retrieve normalized findings matrix for a scan."""
    stmt = select(Scan).where(Scan.id == scan_id)
    scan = (await session.execute(stmt)).scalar_one_or_none()
    if not scan:
        raise NotFoundError("Scan", scan_id)

    query = select(Finding).where(Finding.scan_id == scan_id)
    if severity:
        query = query.where(Finding.severity == severity)
    if source:
        query = query.where(Finding.source == source)

    findings = (await session.execute(query)).scalars().all()

    return FindingsListOut(
        scan_id=scan_id,
        total=len(findings),
        findings=[FindingOut.model_validate(f) for f in findings],
    )
