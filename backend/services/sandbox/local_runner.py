"""
Local (non-Docker) sandbox runner.
Runs pytest directly on the host when Docker is unavailable.
Used as an automatic fallback so the Validation page shows real results
instead of blanket 'Docker unavailable' errors.
"""

import asyncio
import os
import re
import sys
import time
from pathlib import Path

from backend.core.interfaces import (
    SandboxConfig,
    SandboxRunner,
    TestPhase,
    TestRunResult,
    ValidationStatus,
)


class LocalSandboxRunner(SandboxRunner):
    """
    Executes tests directly on the host via subprocess.
    Provides real pytest results without requiring Docker.
    """

    def __init__(self, default_config: SandboxConfig | None = None):
        self.default_config = default_config or SandboxConfig()

    async def is_available(self) -> bool:
        """Local runner is always available."""
        return True

    async def run_phase(
        self,
        phase: TestPhase,
        workspace: Path,
        command: list[str],
        config: SandboxConfig | None = None,
    ) -> TestRunResult:
        """
        Run a single validation phase directly on the host.
        """
        cfg = config or self.default_config
        start_time = time.perf_counter()

        # Use sys.executable to find the exact Python running the backend
        python_exe = sys.executable

        import subprocess

        # Build the command – run pytest via the same python that runs the backend
        cmd_to_run = list(command)
        if cmd_to_run and cmd_to_run[0] == "pytest":
            cmd_to_run = [python_exe, "-m"] + cmd_to_run
        elif cmd_to_run and cmd_to_run[0] == "python":
            cmd_to_run[0] = python_exe

        # Inherit host environment but override PYTHONPATH
        env = dict(os.environ)
        env["PYTHONPATH"] = str(workspace)
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        env["PYTHONUNBUFFERED"] = "1"

        print(f"[LOCAL-RUNNER] Phase {phase}: running {' '.join(cmd_to_run[:5])}... in {workspace}")

        def _execute_sync() -> tuple[int, str]:
            try:
                proc = subprocess.run(
                    cmd_to_run,
                    cwd=str(workspace),
                    env=env,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    timeout=float(cfg.timeout_seconds),
                )
                return proc.returncode, proc.stdout or ""
            except subprocess.TimeoutExpired:
                return 124, "[ERROR] Test execution timed out and was killed."
            except Exception as exc:
                return 126, f"Local execution error: {type(exc).__name__}: {exc}"

        try:
            exit_code, raw_output = await asyncio.to_thread(_execute_sync)
        except Exception as e:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            error_msg = f"Local runner thread error: {type(e).__name__}: {e}"
            print(f"[LOCAL-RUNNER] ❌ {error_msg}")
            return TestRunResult(
                phase=phase,
                exit_code=126,
                passed=0,
                failed=0,
                status=ValidationStatus.NOT_VERIFIED,
                reason=error_msg,
                raw_output=f"[LOCAL-RUNNER ERROR] {error_msg}\nPython: {python_exe}\nCommand: {' '.join(cmd_to_run)}\nWorkspace: {workspace}",
                duration_ms=duration_ms,
            )

        duration_ms = int((time.perf_counter() - start_time) * 1000)

        # Cap output size
        if len(raw_output.encode("utf-8")) > cfg.max_output_bytes:
            raw_output = raw_output[: cfg.max_output_bytes] + "\n... [OUTPUT TRUNCATED] ..."

        # Parse test results
        passed_count, failed_count = self._parse_pytest_counts(raw_output)

        print(f"[LOCAL-RUNNER] Phase {phase}: exit={exit_code} passed={passed_count} failed={failed_count}")

        if exit_code == 0:
            status = ValidationStatus.VERIFIED
            reason = f"All {passed_count} tests passed"
        elif exit_code == 1:
            status = ValidationStatus.FAILED
            reason = f"Test assertions failed ({failed_count} failed, {passed_count} passed)"
        elif exit_code == 5:
            status = ValidationStatus.NOT_VERIFIED
            reason = "No tests collected (pytest exit code 5)"
        else:
            status = ValidationStatus.NOT_VERIFIED
            reason = f"Pytest exited with code {exit_code}"

        return TestRunResult(
            phase=phase,
            exit_code=exit_code,
            passed=passed_count,
            failed=failed_count,
            status=status,
            reason=reason,
            raw_output=raw_output,
            duration_ms=duration_ms,
        )

    def _parse_pytest_counts(self, output: str) -> tuple[int, int]:
        """Extract passed and failed test counts from pytest stdout."""
        passed = 0
        failed = 0

        pass_match = re.search(r"(\d+)\s+passed", output)
        if pass_match:
            passed = int(pass_match.group(1))

        fail_match = re.search(r"(\d+)\s+failed", output)
        if fail_match:
            failed = int(fail_match.group(1))

        return passed, failed


local_sandbox_runner = LocalSandboxRunner()
