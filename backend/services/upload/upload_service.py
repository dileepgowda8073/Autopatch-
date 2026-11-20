import json
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.config import settings
from backend.core.security import validate_and_extract_zip, sanitize_filename
from backend.core.errors import UploadTooLargeError, SecurityViolationError
from backend.models.db import Project
from backend.services.patcher.patch_engine import create_pristine_snapshot


@dataclass
class LanguageDetectionResult:
    language: str
    confidence: float
    reasons: list[str]

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, str):
            return self.language == other
        if isinstance(other, LanguageDetectionResult):
            return (
                self.language == other.language
                and self.confidence == other.confidence
                and self.reasons == other.reasons
            )
        return False

    def __str__(self) -> str:
        return self.language


def detect_project_language(root_dir: Path) -> LanguageDetectionResult:
    """
    Auto-detect language based on build files, config files, and file extensions.
    Returns LanguageDetectionResult with language, confidence (float), and reasons (list).
    """
    reasons: list[str] = []

    # Check Python manifests
    has_req = (root_dir / "requirements.txt").exists()
    has_pyproj = (root_dir / "pyproject.toml").exists()
    has_setup = (root_dir / "setup.py").exists()

    if has_req:
        reasons.append("Found Python requirements.txt manifest")
    if has_pyproj:
        reasons.append("Found Python pyproject.toml configuration")
    if has_setup:
        reasons.append("Found Python setup.py script")

    has_python_build = has_req or has_pyproj or has_setup

    # Check Java manifests
    has_pom = (root_dir / "pom.xml").exists()
    has_gradle = (root_dir / "build.gradle").exists()
    has_gradle_kts = (root_dir / "build.gradle.kts").exists()

    if has_pom:
        reasons.append("Found Maven pom.xml build descriptor")
    if has_gradle:
        reasons.append("Found Gradle build.gradle script")
    if has_gradle_kts:
        reasons.append("Found Gradle Kotlin DSL build.gradle.kts script")

    has_java_build = has_pom or has_gradle or has_gradle_kts

    py_count = 0
    java_count = 0

    for path in root_dir.rglob("*"):
        if path.is_file():
            suffix = path.suffix.lower()
            if suffix == ".py":
                py_count += 1
            elif suffix == ".java":
                java_count += 1

    if py_count > 0:
        reasons.append(f"Found {py_count} Python source file(s) (.py)")
    if java_count > 0:
        reasons.append(f"Found {java_count} Java source file(s) (.java)")

    if (has_python_build or py_count > 0) and (has_java_build or java_count > 0):
        return LanguageDetectionResult(
            language="mixed",
            confidence=0.95,
            reasons=reasons,
        )

    if has_python_build or py_count > 0:
        confidence = 1.0 if (has_python_build and py_count > 0) else 0.90
        return LanguageDetectionResult(
            language="python",
            confidence=confidence,
            reasons=reasons,
        )

    if has_java_build or java_count > 0:
        confidence = 1.0 if (has_java_build and java_count > 0) else 0.90
        return LanguageDetectionResult(
            language="java",
            confidence=confidence,
            reasons=reasons,
        )

    return LanguageDetectionResult(
        language="unknown",
        confidence=0.0,
        reasons=["No supported build manifests (requirements.txt, pom.xml, build.gradle) or recognized source files found"],
    )


async def process_project_upload(file: UploadFile, session: AsyncSession) -> Project:
    """
    Handle single .py/.java file or ZIP project archive.
    Extracts to session workspace, validates bounds, detects language, and persists Project record.
    """
    project_id = str(uuid.uuid4())
    workspace_dir = Path(settings.AUTOPATCH_WORKSPACE_ROOT) / project_id
    workspace_dir.mkdir(parents=True, exist_ok=True)

    original_name = file.filename or "uploaded_project"
    clean_name = Path(original_name).name
    ext = Path(clean_name).suffix.lower()

    if ext not in {".zip", ".py", ".java"}:
        raise SecurityViolationError(
            f"Unsupported file format '{ext}'. AutoPatch only accepts .py, .java, or .zip projects.",
            details={"allowed": [".zip", ".py", ".java"]},
        )

    # Read content with size guard
    content = await file.read()
    if len(content) > settings.AUTOPATCH_MAX_UPLOAD_BYTES:
        raise UploadTooLargeError(
            f"Uploaded file exceeds {settings.AUTOPATCH_MAX_UPLOAD_BYTES} bytes.",
            details={"size_bytes": len(content), "max_bytes": settings.AUTOPATCH_MAX_UPLOAD_BYTES},
        )

    file_count = 0

    if ext == ".zip":
        temp_zip = workspace_dir / "temp_upload.zip"
        try:
            with open(temp_zip, "wb") as f:
                f.write(content)

            extracted = validate_and_extract_zip(temp_zip, workspace_dir)
            file_count = len(extracted)
        finally:
            if temp_zip.exists():
                temp_zip.unlink()
    else:
        # Single .py or .java file
        safe_name = sanitize_filename(clean_name)
        target = workspace_dir / safe_name
        with open(target, "wb") as f:
            f.write(content)
        file_count = 1

    lang_result = detect_project_language(workspace_dir)

    # Create immutable pristine snapshot with SHA-256 hashes for safe rollback
    create_pristine_snapshot(workspace_dir)

    # Base project name without extension
    display_name = clean_name.removesuffix(ext) or "project"

    project = Project(
        id=project_id,
        name=display_name,
        language=lang_result.language,
        language_confidence=lang_result.confidence,
        language_reasons=json.dumps(lang_result.reasons),
        root_path=str(workspace_dir.resolve()),
    )

    session.add(project)
    await session.commit()
    await session.refresh(project)

    return project
