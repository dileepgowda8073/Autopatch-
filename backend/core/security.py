import os
import zipfile
from pathlib import Path
from backend.core.errors import SecurityViolationError
from backend.core.config import settings

# Ignored directory names
IGNORED_DIRS = {
    ".git",
    ".github",
    "venv",
    ".venv",
    "env",
    "__pycache__",
    "node_modules",
    "target",
    "build",
    "dist",
    ".idea",
    ".vscode",
    ".pytest_cache",
    ".ruff_cache",
}

# Whitelist of allowed extensions for project analysis
ALLOWED_EXTENSIONS = {
    ".py",
    ".java",
    ".txt",
    ".md",
    ".json",
    ".xml",
    ".gradle",
    ".properties",
    ".toml",
    ".ini",
    ".yaml",
    ".yml",
    ".cfg",
    ".rst",
}


def sanitize_filename(filename: str) -> str:
    """Strip dangerous characters and ensure a safe relative file path."""
    clean = filename.replace("\\", "/").lstrip("/")
    parts = [p for p in clean.split("/") if p and p != "." and p != ".."]
    return "/".join(parts)


def is_safe_path(base_dir: Path, target_path: Path) -> bool:
    """Verify that target_path resolves strictly within base_dir (prevents zip-slip)."""
    try:
        resolved_base = base_dir.resolve()
        resolved_target = target_path.resolve()
        return resolved_base in resolved_target.parents or resolved_base == resolved_target
    except Exception:
        return False


def validate_and_extract_zip(zip_path: Path, destination_dir: Path) -> list[Path]:
    """
    Safely extract a ZIP archive with complete protection against:
      1. Zip-Slip (path traversal via ../ or absolute paths)
      2. Symlink attacks
      3. Zip-Bombs (uncompressed file count and total size caps)
      4. Disallowed executable formats
    """
    destination_dir.mkdir(parents=True, exist_ok=True)
    extracted_files: list[Path] = []

    total_uncompressed_bytes = 0
    file_count = 0

    with zipfile.ZipFile(zip_path, "r") as zf:
        infolist = zf.infolist()

        if len(infolist) > settings.AUTOPATCH_MAX_ZIP_FILES:
            raise SecurityViolationError(
                f"ZIP contains {len(infolist)} entries, exceeding safety limit of {settings.AUTOPATCH_MAX_ZIP_FILES}.",
                details={"max_files": settings.AUTOPATCH_MAX_ZIP_FILES, "found": len(infolist)},
            )

        for member in infolist:
            file_count += 1
            total_uncompressed_bytes += member.file_size

            # Check total uncompressed size limit
            if total_uncompressed_bytes > settings.AUTOPATCH_MAX_UNCOMPRESSED_BYTES:
                raise SecurityViolationError(
                    f"ZIP uncompressed payload exceeds limit of {settings.AUTOPATCH_MAX_UNCOMPRESSED_BYTES} bytes (Zip-bomb defense).",
                    details={"max_bytes": settings.AUTOPATCH_MAX_UNCOMPRESSED_BYTES},
                )

            # Block symlinks
            # The upper 16 bits of external_attr store the UNIX mode; S_IFLNK is 0o120000
            mode = member.external_attr >> 16
            if mode & 0o120000 == 0o120000:
                raise SecurityViolationError(
                    f"Security violation: Archive entry '{member.filename}' is a symbolic link.",
                    details={"entry": member.filename},
                )

            # Check safe sanitized path
            safe_rel = sanitize_filename(member.filename)
            if not safe_rel:
                continue

            # Check ignored directories
            path_parts = set(Path(safe_rel).parts)
            if any(part in IGNORED_DIRS for part in path_parts):
                continue

            target_path = destination_dir / safe_rel

            # Strict Zip-Slip check
            if not is_safe_path(destination_dir, target_path):
                raise SecurityViolationError(
                    f"Zip-slip path traversal attempt detected in entry '{member.filename}'.",
                    details={"entry": member.filename},
                )

            if member.is_dir():
                target_path.mkdir(parents=True, exist_ok=True)
                continue

            # Extension verification
            ext = target_path.suffix.lower()
            if ext and ext not in ALLOWED_EXTENSIONS:
                continue

            target_path.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(member) as src, open(target_path, "wb") as dst:
                while chunk := src.read(65536):
                    dst.write(chunk)

            extracted_files.append(target_path)

    return extracted_files
