# Adding a New Language to AutoPatch

AutoPatch is designed around a plugin architecture where language adapters and bug detectors implement strict Abstract Base Classes (ABCs) defined in `backend/core/interfaces.py`.

Adding support for a new language (e.g., Go, Rust, TypeScript) **never requires modifying the core pipeline orchestrator**.

---

## 1. Implement `LanguageAdapter`

Subclass `LanguageAdapter` to provide project introspection, compilation, and test suite commands:

```python
from pathlib import Path
from backend.core.interfaces import LanguageAdapter

class GoLanguageAdapter(LanguageAdapter):
    @property
    def language_id(self) -> str:
        return "go"

    def detect(self, workspace: Path) -> bool:
        return (workspace / "go.mod").exists() or any(workspace.rglob("*.go"))

    def entry_point(self, workspace: Path) -> Path | None:
        main_go = workspace / "main.go"
        return main_go if main_go.exists() else None

    def test_files(self, workspace: Path) -> list[Path]:
        return list(workspace.rglob("*_test.go"))

    def dependencies(self, workspace: Path) -> list[str]:
        # Parse go.mod dependencies
        return []

    def missing_dependencies(self, workspace: Path) -> list[str]:
        return []

    def build_command(self, workspace: Path) -> list[str] | None:
        return ["go", "build", "./..."]

    def test_command(self, workspace: Path) -> list[str]:
        return ["go", "test", "-v", "./..."]
```

---

## 2. Implement `Detector`

Subclass `Detector` to add static linter or analyzer plugins (e.g. `golangci-lint`):

```python
from pathlib import Path
from backend.core.interfaces import Detector, SourceTool, FindingData, Severity
from backend.services.detector.normalizer import normalize_finding

class GoLintDetector(Detector):
    @property
    def name(self) -> SourceTool:
        return SourceTool("golangci-lint")

    @property
    def language(self) -> str:
        return "go"

    async def run(
        self,
        workspace: Path,
        *,
        timeout_seconds: int = 60,
        max_output_bytes: int = 1_048_576,
    ) -> list[FindingData]:
        # 1. Run linter binary as subprocess
        # 2. Parse output into normalized FindingData instances
        # 3. Always catch exceptions and return [] on linter failures
        return []
```

Register your adapter in `backend/services/upload/upload_service.py` and your detector in `backend/services/detector/engine.py`. The orchestrator will automatically route projects of that language through the detection, patch, and validation pipeline.
