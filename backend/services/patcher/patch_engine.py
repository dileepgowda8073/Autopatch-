import ast
import hashlib
import json
import re
import shutil
from pathlib import Path
from typing import Any

SNAPSHOT_DIR_NAME = ".autopatch_snapshot"


def calculate_file_hash(file_path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def get_workspace_hashes(workspace_dir: Path) -> dict[str, str]:
    """
    Compute relative_path -> sha256 hash for all workspace files,
    ignoring temporary snapshots and metadata folders.
    """
    hashes: dict[str, str] = {}
    for p in workspace_dir.rglob("*"):
        if p.is_file() and SNAPSHOT_DIR_NAME not in p.parts and ".git" not in p.parts:
            rel = str(p.relative_to(workspace_dir)).replace("\\", "/")
            hashes[rel] = calculate_file_hash(p)
    return hashes


def create_pristine_snapshot(workspace_dir: Path) -> dict[str, str]:
    """
    Create an immutable pristine snapshot of the workspace at upload time.
    Stores copies of all source files in `.autopatch_snapshot/` along with a signed manifest of hashes.
    """
    snapshot_dir = workspace_dir / SNAPSHOT_DIR_NAME
    if snapshot_dir.exists():
        shutil.rmtree(snapshot_dir)
    snapshot_dir.mkdir(parents=True, exist_ok=True)

    manifest: dict[str, str] = {}

    for file_path in workspace_dir.rglob("*"):
        if (
            file_path.is_file()
            and SNAPSHOT_DIR_NAME not in file_path.parts
            and ".git" not in file_path.parts
        ):
            rel_path = str(file_path.relative_to(workspace_dir)).replace("\\", "/")
            dest_path = snapshot_dir / rel_path
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file_path, dest_path)

            file_hash = calculate_file_hash(file_path)
            manifest[rel_path] = file_hash

    # Save manifest.json
    manifest_file = snapshot_dir / "manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    return manifest


def restore_workspace_from_snapshot(workspace_dir: Path) -> dict[str, str]:
    """
    Physically restore all workspace files from the pristine snapshot.
    Removes any newly created files and overwrites modified files.
    """
    snapshot_dir = workspace_dir / SNAPSHOT_DIR_NAME
    manifest_file = snapshot_dir / "manifest.json"

    if not snapshot_dir.exists() or not manifest_file.exists():
        raise FileNotFoundError(f"Pristine snapshot not found in {workspace_dir}")

    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest: dict[str, str] = json.load(f)

    # 1. Remove current workspace files that are not part of snapshot
    for file_path in list(workspace_dir.rglob("*")):
        if (
            file_path.is_file()
            and SNAPSHOT_DIR_NAME not in file_path.parts
            and ".git" not in file_path.parts
        ):
            rel = str(file_path.relative_to(workspace_dir)).replace("\\", "/")
            if rel not in manifest:
                file_path.unlink()

    # 2. Restore all files from snapshot
    for rel_path in manifest.keys():
        src_path = snapshot_dir / rel_path
        dst_path = workspace_dir / rel_path
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_path, dst_path)

    # Verify restored hashes match original snapshot
    current_hashes = get_workspace_hashes(workspace_dir)
    for rel_path, expected_hash in manifest.items():
        if current_hashes.get(rel_path) != expected_hash:
            raise ValueError(f"Rollback hash mismatch for {rel_path}")

    return current_hashes


def extract_files_from_unified_diff(diff_text: str) -> list[str]:
    """Parse a unified diff to find all target files being modified."""
    files: set[str] = set()
    for line in diff_text.splitlines():
        if line.startswith("+++ b/"):
            files.add(line[6:].strip().replace("\\", "/"))
        elif line.startswith("+++ ") and not line.startswith("+++ /dev/null"):
            files.add(line[4:].strip().replace("\\", "/"))
    return sorted(list(files))


def apply_patch_to_string(original_content: str, diff_text: str) -> str:
    """
    Apply a unified diff string to source text.
    Handles standard unified diff format with @@ -old,count +new,count @@ headers.
    """
    original_lines = original_content.splitlines(keepends=True)
    if not original_lines and original_content:
        original_lines = [original_content]

    # Normalize line endings
    original_lines = [line.replace("\r\n", "\n") for line in original_lines]

    diff_lines = diff_text.splitlines()

    # If diff does not have diff headers or is a simple replacement block
    hunk_pattern = re.compile(r"^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@")

    new_lines: list[str] = []
    orig_idx = 0

    hunk_found = False

    for line in diff_lines:
        if line.startswith("---") or line.startswith("+++"):
            continue

        hunk_match = hunk_pattern.match(line)
        if hunk_match:
            hunk_found = True
            old_start = int(hunk_match.group(1))
            # 1-indexed to 0-indexed
            target_idx = max(0, old_start - 1)
            # Copy all unchanged lines up to old_start - 1
            while orig_idx < target_idx and orig_idx < len(original_lines):
                new_lines.append(original_lines[orig_idx])
                orig_idx += 1
            continue

        if not hunk_found:
            continue

        if line.startswith("+"):
            new_lines.append(line[1:] + "\n")
        elif line.startswith("-"):
            # Skip the deleted line from original
            orig_idx += 1
        elif line.startswith(" "):
            # Context line: ensure advance
            if orig_idx < len(original_lines):
                new_lines.append(original_lines[orig_idx])
                orig_idx += 1
            else:
                new_lines.append(line[1:] + "\n")

    # Copy remaining lines after last hunk
    while orig_idx < len(original_lines):
        new_lines.append(original_lines[orig_idx])
        orig_idx += 1

    result = "".join(new_lines)
    return result


def verify_syntax(file_path: Path, content: str) -> None:
    """Validate that patched content parses cleanly without syntax errors."""
    suffix = file_path.suffix.lower()
    if suffix == ".py":
        try:
            ast.parse(content, filename=str(file_path))
        except SyntaxError as e:
            raise ValueError(f"Patched Python file '{file_path.name}' has syntax errors: {e}") from e
    elif suffix == ".java":
        # Check basic structural bracket balance for Java
        open_b = content.count("{")
        close_b = content.count("}")
        if open_b != close_b:
            raise ValueError(f"Patched Java file '{file_path.name}' has unbalanced braces ({{={open_b}, }}={close_b}).")


def create_temp_workspace_for_patch(workspace_dir: Path, patch_id: str) -> Path:
    """
    Duplicate the project workspace to a temporary per-patch sandbox directory.
    Original workspace is left completely untouched.
    """
    temp_dir = workspace_dir.parent / f"{workspace_dir.name}_patch_{patch_id}"
    if temp_dir.exists():
        shutil.rmtree(temp_dir)

    shutil.copytree(
        workspace_dir,
        temp_dir,
        ignore=shutil.ignore_patterns(SNAPSHOT_DIR_NAME, "*_patch_*"),
    )
    return temp_dir


def apply_patch_to_temp_workspace(
    temp_workspace: Path,
    expected_finding_file: str,
    diff_text: str,
) -> Path:
    """
    Apply unified diff strictly to the temporary workspace copy:
      1. Verifies diff only touches the expected finding file.
      2. Rejects patches touching unrelated files.
      3. Applies diff to the target file.
      4. Verifies syntax (ast.parse / bracket validation).
    """
    touched_files = extract_files_from_unified_diff(diff_text)
    norm_expected = expected_finding_file.replace("\\", "/").lstrip("/")

    # Reject if diff touches any file unrelated to the finding
    for tf in touched_files:
        norm_tf = tf.lstrip("/")
        if norm_tf != norm_expected:
            raise ValueError(
                f"Patch rejected: Attempted to modify unrelated file '{norm_tf}'. "
                f"Finding is restricted strictly to '{norm_expected}'."
            )

    target_file = temp_workspace / norm_expected
    if not target_file.exists():
        raise FileNotFoundError(f"Target file for patch '{norm_expected}' does not exist in workspace.")

    original_code = target_file.read_text(encoding="utf-8")
    patched_code = apply_patch_to_string(original_code, diff_text)

    # Verify that patched code still parses
    verify_syntax(target_file, patched_code)

    # Write to temp workspace copy only
    target_file.write_text(patched_code, encoding="utf-8")
    return target_file


def apply_patch_to_project_workspace(
    project_workspace: Path,
    expected_finding_file: str,
    diff_text: str,
) -> Path:
    """
    Apply a human-accepted patch directly to the active project workspace.
    """
    norm_expected = expected_finding_file.replace("\\", "/").lstrip("/")
    target_file = project_workspace / norm_expected
    if not target_file.exists():
        raise FileNotFoundError(f"Target file '{norm_expected}' does not exist in project.")

    original_code = target_file.read_text(encoding="utf-8")
    patched_code = apply_patch_to_string(original_code, diff_text)
    verify_syntax(target_file, patched_code)

    target_file.write_text(patched_code, encoding="utf-8")
    return target_file
