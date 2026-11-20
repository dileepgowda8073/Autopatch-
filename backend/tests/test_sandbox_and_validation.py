import asyncio
from pathlib import Path
import pytest

from backend.core.interfaces import (
    SandboxConfig,
    SandboxRunner,
    TestPhase,
    TestRunResult,
    ValidationStatus,
    SourceTool,
)
from backend.services.sandbox.sandbox_runner import DockerSandboxRunner
from backend.services.validation.validation_engine import ValidationEngine
from backend.services.detector.engine import DetectionEngine


class MockDockerRunner(SandboxRunner):
    """Mock runner for testing ValidationEngine status logic without Docker."""

    def __init__(self, exit_codes: dict[TestPhase, int], outputs: dict[TestPhase, str]):
        self.exit_codes = exit_codes
        self.outputs = outputs

    async def is_available(self) -> bool:
        return True

    async def run_phase(
        self,
        phase: TestPhase,
        workspace: Path,
        command: list[str],
        config: SandboxConfig | None = None,
    ) -> TestRunResult:
        code = self.exit_codes.get(phase, 0)
        out = self.outputs.get(phase, "")
        passed = 8 if code == 0 else 4
        failed = 0 if code == 0 else 4

        st = ValidationStatus.VERIFIED if code == 0 else ValidationStatus.FAILED
        if code == 5:
            st = ValidationStatus.NOT_VERIFIED

        return TestRunResult(
            phase=phase,
            exit_code=code,
            passed=passed,
            failed=failed,
            status=st,
            reason="Mock reason" if code != 0 else None,
            raw_output=out,
            duration_ms=100,
        )


class UnavailableDockerRunner(SandboxRunner):
    """Simulates Docker being completely unavailable."""

    async def is_available(self) -> bool:
        return False

    async def run_phase(
        self,
        phase: TestPhase,
        workspace: Path,
        command: list[str],
        config: SandboxConfig | None = None,
    ) -> TestRunResult:
        return TestRunResult(
            phase=phase,
            exit_code=127,
            passed=0,
            failed=0,
            status=ValidationStatus.NOT_VERIFIED,
            reason="Docker unavailable",
            raw_output="Docker daemon not running",
            duration_ms=0,
        )


import shutil


def test_docker_sandbox_runner_unavailable(monkeypatch):
    """Verify DockerSandboxRunner returns not_verified when Docker is not present."""
    monkeypatch.setattr(shutil, "which", lambda cmd: None)
    async def _test():
        runner = DockerSandboxRunner()
        res = await runner.run_phase(
            TestPhase.BEFORE,
            Path("sample_projects/python_marks"),
            ["pytest"],
        )
        assert res.status == ValidationStatus.NOT_VERIFIED
        assert "Docker" in (res.reason or "")
        assert res.exit_code == 127
    asyncio.run(_test())


def test_docker_sandbox_runner_missing_image():
    """Verify DockerSandboxRunner returns not_verified when image is missing."""
    async def _test():
        runner = DockerSandboxRunner()
        cfg = SandboxConfig(image="autopatch-missing-image-xyz:test")
        res = await runner.run_phase(
            TestPhase.BEFORE,
            Path("sample_projects/python_marks"),
            ["pytest"],
            config=cfg,
        )
        assert res.status == ValidationStatus.NOT_VERIFIED
        assert "missing" in (res.reason or "").lower()
        assert res.exit_code == 125
    asyncio.run(_test())


def test_docker_sandbox_runner_timeout():
    """Verify runner enforces wall-clock timeout and returns not_verified."""
    async def _test():
        runner = DockerSandboxRunner()
        if not await runner.is_available():
            pytest.skip("Docker not available")
        cfg = SandboxConfig(timeout_seconds=2)
        res = await runner.run_phase(
            TestPhase.BEFORE,
            Path("sample_projects/python_marks"),
            ["python", "-c", "import time; time.sleep(10)"],
            config=cfg,
        )
        assert res.status == ValidationStatus.NOT_VERIFIED
        assert "timed out" in (res.reason or "").lower()
        assert res.exit_code == 124
    asyncio.run(_test())


def test_docker_sandbox_runner_real_execution():
    """Verify real Docker container execution produces platform linux output."""
    async def _test():
        runner = DockerSandboxRunner()
        if not await runner.is_available() or not await runner.image_exists("autopatch-sandbox-python:latest"):
            pytest.skip("Docker or sandbox image not available")
        res = await runner.run_phase(
            TestPhase.BEFORE,
            Path("sample_projects/python_marks"),
            ["pytest", "-p", "no:cacheprovider", "-v"],
        )
        assert res.status == ValidationStatus.FAILED
        assert res.exit_code == 1
        assert res.passed == 4
        assert res.failed == 4
        assert "platform linux" in res.raw_output
    asyncio.run(_test())


def test_validation_engine_docker_unavailable():
    """Verify ValidationEngine returns not_verified across all phases if Docker is unavailable."""
    async def _test():
        engine = ValidationEngine(runner=UnavailableDockerRunner())
        status, phases = await engine.validate_patch(
            Path("sample_projects/python_marks"),
            Path("sample_projects/python_marks"),
        )
        assert status == "not_verified"
        assert len(phases) == 4
        for p in phases:
            assert p.status == ValidationStatus.NOT_VERIFIED
            assert "Docker daemon is unavailable" in (p.reason or "")
    asyncio.run(_test())


def test_validation_engine_status_mappings():
    """
    Test ValidationEngine status semantics:
      exit 0 = verified
      exit 1 = failed
      exit 5 = not_verified (no tests collected)
      syntax / compile error = not_verified
    """
    async def _test():
        # 1. Success case: before has failure, targeted/edge/after pass
        mock_runner = MockDockerRunner(
            exit_codes={
                TestPhase.BEFORE: 1,
                TestPhase.TARGETED: 0,
                TestPhase.EDGE: 0,
                TestPhase.AFTER: 0,
            },
            outputs={
                TestPhase.BEFORE: "4 failed, 4 passed",
                TestPhase.TARGETED: "2 passed",
                TestPhase.EDGE: "4 passed",
                TestPhase.AFTER: "8 passed",
            },
        )
        engine = ValidationEngine(runner=mock_runner)
        status, phases = await engine.validate_patch(Path("."), Path("."))
        assert status == "verified"
        assert phases[0].status == ValidationStatus.FAILED
        assert phases[3].status == ValidationStatus.VERIFIED

        # 2. Exit 5: No tests collected -> not_verified
        mock_exit5 = MockDockerRunner(
            exit_codes={
                TestPhase.BEFORE: 5,
                TestPhase.TARGETED: 5,
                TestPhase.EDGE: 5,
                TestPhase.AFTER: 5,
            },
            outputs={
                TestPhase.BEFORE: "no tests collected",
                TestPhase.TARGETED: "no tests collected",
                TestPhase.EDGE: "no tests collected",
                TestPhase.AFTER: "no tests collected",
            },
        )
        engine5 = ValidationEngine(runner=mock_exit5)
        status5, phases5 = await engine5.validate_patch(Path("."), Path("."))
        assert status5 == "not_verified"
        assert "No tests collected" in (phases5[0].reason or "")

        # 3. Syntax error -> not_verified
        mock_syntax = MockDockerRunner(
            exit_codes={
                TestPhase.BEFORE: 1,
                TestPhase.TARGETED: 2,
                TestPhase.EDGE: 2,
                TestPhase.AFTER: 2,
            },
            outputs={
                TestPhase.BEFORE: "4 failed, 4 passed",
                TestPhase.TARGETED: "SyntaxError: invalid syntax in calculator.py line 4",
                TestPhase.EDGE: "SyntaxError: invalid syntax in calculator.py line 4",
                TestPhase.AFTER: "SyntaxError: invalid syntax in calculator.py line 4",
            },
        )
        engine_syntax = ValidationEngine(runner=mock_syntax)
        status_syn, phases_syn = await engine_syntax.validate_patch(Path("."), Path("."))
        assert status_syn == "not_verified"
        assert phases_syn[1].status == ValidationStatus.NOT_VERIFIED
        assert "Syntax" in (phases_syn[1].reason or "")
    asyncio.run(_test())


def test_ruff_wired_into_detection_engine(tmp_path):
    """Verify Ruff linter is executed and creates SourceTool.RUFF findings."""
    async def _test():
        bad_py = tmp_path / "bad.py"
        bad_py.write_text("import sys\nimport os\n\ndef foo():\n    return 42\n", encoding="utf-8")

        engine = DetectionEngine()
        findings = await engine.run_detection(tmp_path, "python")

        ruff_findings = [f for f in findings if f.source == SourceTool.RUFF]
        assert len(ruff_findings) > 0
        codes = [f.title for f in ruff_findings]
        assert any("F401" in c for c in codes)
    asyncio.run(_test())
