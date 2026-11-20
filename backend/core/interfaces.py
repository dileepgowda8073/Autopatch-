import abc
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any


class Severity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class SourceTool(str, Enum):
    RUFF = "ruff"
    BANDIT = "bandit"
    PYTEST = "pytest"
    JAVAC = "javac"
    SPOTBUGS = "spotbugs"
    CHECKSTYLE = "checkstyle"
    JUNIT = "junit"
    LLM = "llm"


class ValidationStatus(str, Enum):
    VERIFIED = "verified"
    FAILED = "failed"
    NOT_VERIFIED = "not_verified"


class TestPhase(str, Enum):
    BEFORE = "before"
    TARGETED = "targeted"
    EDGE = "edge"
    AFTER = "after"


class DecisionType(str, Enum):
    ACCEPT = "accept"
    REJECT = "reject"
    NEEDS_REVIEW = "needs_review"
    ROLLBACK = "rollback"


@dataclass
class FindingData:
    file: str
    line_start: int
    line_end: int
    title: str
    description: str
    trigger: str
    repro_input: str
    expected: str
    actual: str
    root_cause: str
    source: SourceTool
    severity: Severity
    severity_reason: str
    confidence_estimate: float
    is_candidate: bool = False
    raw_evidence: dict[str, Any] = field(default_factory=dict)


@dataclass
class TestRunResult:
    phase: TestPhase
    exit_code: int
    passed: int
    failed: int
    status: ValidationStatus
    reason: str | None
    raw_output: str
    duration_ms: int


class Detector(abc.ABC):
    @property
    @abc.abstractmethod
    def name(self) -> SourceTool:
        ...

    @property
    @abc.abstractmethod
    def language(self) -> str:
        ...

    @abc.abstractmethod
    async def run(
        self,
        workspace: Path,
        *,
        timeout_seconds: int = 60,
        max_output_bytes: int = 1_048_576,
    ) -> list[FindingData]:
        ...


class LanguageAdapter(abc.ABC):
    @property
    @abc.abstractmethod
    def language_id(self) -> str:
        ...

    @abc.abstractmethod
    def detect(self, workspace: Path) -> bool:
        ...

    @abc.abstractmethod
    def entry_point(self, workspace: Path) -> Path | None:
        ...

    @abc.abstractmethod
    def test_files(self, workspace: Path) -> list[Path]:
        ...

    @abc.abstractmethod
    def dependencies(self, workspace: Path) -> list[str]:
        ...

    @abc.abstractmethod
    def missing_dependencies(self, workspace: Path) -> list[str]:
        ...

    @abc.abstractmethod
    def build_command(self, workspace: Path) -> list[str] | None:
        ...

    @abc.abstractmethod
    def test_command(self, workspace: Path) -> list[str]:
        ...


@dataclass
class LLMMessage:
    role: str
    content: str


@dataclass
class LLMResponse:
    content: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    cached: bool = False


class LLMProvider(abc.ABC):
    @property
    @abc.abstractmethod
    def provider_id(self) -> str:
        ...

    @abc.abstractmethod
    async def complete(
        self,
        messages: list[LLMMessage],
        *,
        temperature: float = 0.2,
        max_tokens: int = 4096,
        response_mime_type: str = "application/json",
    ) -> LLMResponse:
        ...


class LLMUnavailableError(RuntimeError):
    pass


@dataclass
class SandboxConfig:
    image: str = "autopatch-sandbox-python:latest"
    cpu_quota: float = 0.5
    memory_mb: int = 256
    pids_limit: int = 128
    timeout_seconds: int = 120
    max_output_bytes: int = 1_048_576
    network_disabled: bool = True
    read_only_root: bool = True
    run_as_user: str = "nobody"
    no_new_privileges: bool = True


class SandboxRunner(abc.ABC):
    @abc.abstractmethod
    async def run_phase(
        self,
        phase: TestPhase,
        workspace: Path,
        command: list[str],
        config: SandboxConfig | None = None,
    ) -> TestRunResult:
        ...

    @abc.abstractmethod
    async def is_available(self) -> bool:
        ...


class SandboxUnavailableError(RuntimeError):
    pass
