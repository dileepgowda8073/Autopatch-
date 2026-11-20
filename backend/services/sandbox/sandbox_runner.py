import asyncio
import re
import shutil
import time
from pathlib import Path

from backend.core.interfaces import (
    SandboxConfig,
    SandboxRunner,
    TestPhase,
    TestRunResult,
    ValidationStatus,
)


class DockerSandboxRunner(SandboxRunner):
    """
    Executes tests inside an ephemeral, hardened Docker container:
      - Network completely disabled (--network none)
      - Read-only root filesystem (--read-only)
      - Ephemeral /tmp tmpfs (--tmpfs /tmp)
      - Strict memory limit (--memory 256m)
      - Strict CPU quota (--cpus 0.5)
      - Strict PID limit (--pids-limit 128)
      - Non-root user execution (--user nobody)
      - Workspace mounted read-only at /work (-v <workspace>:/work:ro -w /work)
      - Pytest disables cache (-p no:cacheprovider)
      - Scrubbed environment: zero host secrets passed in
      - Wall-clock timeout and output byte cap
    """

    def __init__(self, default_config: SandboxConfig | None = None):
        self.default_config = default_config or SandboxConfig()

    async def is_available(self) -> bool:
        """Check if Docker CLI is installed and the Docker daemon is responding."""
        docker_bin = shutil.which("docker")
        if not docker_bin:
            return False

        try:
            proc = await asyncio.create_subprocess_exec(
                docker_bin,
                "info",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, _ = await asyncio.wait_for(proc.communicate(), timeout=3.0)
            return proc.returncode == 0
        except Exception:
            return False

    async def image_exists(self, image_name: str) -> bool:
        """Check if target Docker image is present locally."""
        docker_bin = shutil.which("docker")
        if not docker_bin:
            return False
        try:
            proc = await asyncio.create_subprocess_exec(
                docker_bin,
                "image",
                "inspect",
                image_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, _ = await asyncio.wait_for(proc.communicate(), timeout=3.0)
            return proc.returncode == 0
        except Exception:
            return False

    async def run_phase(
        self,
        phase: TestPhase,
        workspace: Path,
        command: list[str],
        config: SandboxConfig | None = None,
    ) -> TestRunResult:
        """
        Run a single validation phase inside the Docker sandbox.
        If Docker is unavailable or image is missing, returns not_verified with reason.
        Never fakes a pass.
        """
        cfg = config or self.default_config

        # 1. Verify Docker daemon availability
        docker_available = await self.is_available()
        if not docker_available:
            return TestRunResult(
                phase=phase,
                exit_code=127,
                passed=0,
                failed=0,
                status=ValidationStatus.NOT_VERIFIED,
                reason="Docker daemon is unavailable or not running on the host system. "
                "AutoPatch requires an isolated container sandbox (--network none, --read-only, --user nobody) "
                "for test verification. Execution cannot proceed without a secure sandbox.",
                raw_output="[SANDBOX ERROR] Docker unavailable: cannot run isolated test suite.",
                duration_ms=0,
            )

        # 2. Verify Docker image exists
        image_name = cfg.image or "autopatch-sandbox-python:latest"
        has_image = await self.image_exists(image_name)
        if not has_image:
            return TestRunResult(
                phase=phase,
                exit_code=125,
                passed=0,
                failed=0,
                status=ValidationStatus.NOT_VERIFIED,
                reason=f"Docker sandbox image '{image_name}' is missing. "
                "Please build the image with 'docker build -t autopatch-sandbox-python .' before running verification.",
                raw_output=f"[SANDBOX ERROR] Image missing: {image_name}",
                duration_ms=0,
            )

        docker_bin = shutil.which("docker") or "docker"
        norm_workspace = str(workspace.resolve()).replace("\\", "/")

        # 3. Format command to ensure pytest cache is disabled in read-only container
        cmd_to_run = list(command)
        if cmd_to_run and "pytest" in cmd_to_run[0]:
            if "no:cacheprovider" not in " ".join(cmd_to_run):
                cmd_to_run.insert(1, "-p")
                cmd_to_run.insert(2, "no:cacheprovider")

        # 4. Build secure Docker container invocation
        # Explicitly scrub host environment: ZERO SECRETS PASSED IN
        pids_lim = getattr(cfg, "pids_limit", 128)
        docker_cmd = [
            docker_bin,
            "run",
            "--rm",
            "--network",
            "none",
            "--read-only",
            "--tmpfs",
            "/tmp",
            "--memory",
            f"{cfg.memory_mb}m",
            "--cpus",
            str(cfg.cpu_quota),
            "--pids-limit",
            str(pids_lim),
            "--user",
            cfg.run_as_user or "nobody",
            "-v",
            f"{norm_workspace}:/work:ro",
            "-w",
            "/work",
            # Clean, non-secret environment variables only
            "-e",
            "PYTHONPATH=/work",
            "-e",
            "PYTHONDONTWRITEBYTECODE=1",
            "-e",
            "PYTHONUNBUFFERED=1",
            "-e",
            "HOME=/tmp",
            image_name,
            *cmd_to_run,
        ]

        start_time = time.perf_counter()
        raw_output = ""
        exit_code = -1
        timed_out = False

        try:
            proc = await asyncio.create_subprocess_exec(
                *docker_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )

            try:
                stdout_data, _ = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=float(cfg.timeout_seconds),
                )
                exit_code = proc.returncode or 0
                raw_output = stdout_data.decode("utf-8", errors="replace")
            except asyncio.TimeoutError:
                timed_out = True
                try:
                    proc.kill()
                    await proc.wait()
                except Exception:
                    pass

        except Exception as e:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            return TestRunResult(
                phase=phase,
                exit_code=126,
                passed=0,
                failed=0,
                status=ValidationStatus.NOT_VERIFIED,
                reason=f"Docker container execution error: {e}",
                raw_output=str(e),
                duration_ms=duration_ms,
            )

        duration_ms = int((time.perf_counter() - start_time) * 1000)

        # 5. Output size cap
        if len(raw_output.encode("utf-8")) > cfg.max_output_bytes:
            capped_len = cfg.max_output_bytes
            raw_output = raw_output[:capped_len] + "\n... [OUTPUT TRUNCATED: EXCEEDED CAP] ..."

        # 6. Handle timeout
        if timed_out:
            return TestRunResult(
                phase=phase,
                exit_code=124,
                passed=0,
                failed=0,
                status=ValidationStatus.NOT_VERIFIED,
                reason=f"Test execution timed out after {cfg.timeout_seconds}s wall-clock limit",
                raw_output=raw_output or "[ERROR] Process timed out and was killed.",
                duration_ms=duration_ms,
            )

        # 7. Parse test results
        passed_count, failed_count = self._parse_pytest_counts(raw_output)

        # Pytest exit code mappings:
        # 0: All tests passed
        # 1: Tests were collected and run but some failed
        # 2: Interrupted by user
        # 3: Internal error
        # 4: Usage error
        # 5: No tests were collected
        if exit_code == 0:
            status = ValidationStatus.VERIFIED
            reason = None
        elif exit_code == 1:
            status = ValidationStatus.FAILED
            reason = f"Test assertions failed ({failed_count} failed, {passed_count} passed)"
        elif exit_code == 5:
            status = ValidationStatus.NOT_VERIFIED
            reason = "No tests collected (pytest exit code 5)"
        else:
            status = ValidationStatus.NOT_VERIFIED
            reason = f"Pytest exited with non-standard code {exit_code}"

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


docker_sandbox_runner = DockerSandboxRunner()
