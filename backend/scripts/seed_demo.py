import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.models.db import init_db, async_session_maker, Project, Scan, Finding, Patch, TestRun, Decision
from backend.services.detector.engine import detection_engine


async def seed():
    print("Initializing AutoPatch database...")
    await init_db()

    async with async_session_maker() as session:
        # Check if already seeded
        from sqlalchemy import select
        existing = (await session.execute(select(Project).where(Project.name == "python_marks"))).scalar_one_or_none()
        if existing:
            print("Demo project 'python_marks' already exists in database.")
            return

        workspace_path = Path(__file__).resolve().parent.parent.parent / "sample_projects" / "python_marks"
        if not workspace_path.exists():
            print(f"Error: {workspace_path} does not exist.")
            return

        print(f"Seeding demo project from {workspace_path}...")
        project = Project(
            id="proj-demo-001",
            name="python_marks",
            language="python",
            root_path=str(workspace_path),
        )
        session.add(project)

        scan = Scan(
            id="scan-demo-001",
            project_id=project.id,
            job_id="job-demo-001",
            status="FINDINGS_READY",
            tool_versions={
                "ruff": "0.4.8",
                "bandit": "1.7.8",
                "pytest": "8.2.0",
                "llm": "gemini-1.5-flash",
            },
        )
        session.add(scan)

        # Run detection engine
        detected = await detection_engine.run_detection(workspace_path, "python")
        print(f"Detected {len(detected)} findings.")

        finding_ids = []
        for i, df in enumerate(detected):
            f_id = f"f-demo-00{i+1}"
            finding_ids.append(f_id)
            finding = Finding(
                id=f_id,
                scan_id=scan.id,
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

        # Seed patch for finding 1
        diff = """--- a/marks/calculator.py
+++ b/marks/calculator.py
@@ -16,4 +16,8 @@
-    return sum(marks) / len(marks)
+    if not marks:
+        raise ValueError("marks list cannot be empty")
+    for m in marks:
+        if not (0 <= m <= 100):
+            raise ValueError(f"mark {m} out of range [0, 100]")
+    return sum(marks) / len(marks)"""

        patch = Patch(
            id="patch-demo-001",
            finding_id=finding_ids[0] if finding_ids else "f-demo-001",
            diff=diff,
            explanation="Added guard clause for empty list and range assertion loop.",
            attempt=1,
            line_changes=[
                {"line": 16, "action": "remove", "content": "    return sum(marks) / len(marks)"},
                {"line": 16, "action": "add", "content": "    if not marks:"},
                {"line": 17, "action": "add", "content": '        raise ValueError("marks list cannot be empty")'},
                {"line": 18, "action": "add", "content": "    for m in marks:"},
                {"line": 19, "action": "add", "content": "        if not (0 <= m <= 100):"},
                {"line": 20, "action": "add", "content": '            raise ValueError(f"mark {m} out of range [0, 100]")'},
                {"line": 21, "action": "add", "content": "    return sum(marks) / len(marks)"},
            ],
        )
        session.add(patch)

        # Seed test runs
        phases = [
            ("before", 1, 4, 4, "failed", "Empty list raises ZeroDivisionError"),
            ("targeted", 0, 2, 0, "verified", None),
            ("edge", 0, 4, 0, "verified", None),
            ("after", 0, 8, 0, "verified", None),
        ]
        for ph, exit_c, passed, failed, stat, reason in phases:
            tr = TestRun(
                id=f"tr-demo-{ph}",
                patch_id=patch.id,
                phase=ph,
                exit_code=exit_c,
                passed=passed,
                failed=failed,
                status=stat,
                reason=reason,
                raw_output=f"Phase {ph} completed with exit code {exit_c}",
                duration_ms=150,
            )
            session.add(tr)

        await session.commit()
        print("Demo project, scan, findings, patch, and test validation runs seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
