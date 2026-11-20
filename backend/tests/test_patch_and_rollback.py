import shutil
import tempfile
from pathlib import Path
import pytest

from backend.services.patcher.patch_engine import (
    create_pristine_snapshot,
    restore_workspace_from_snapshot,
    get_workspace_hashes,
    create_temp_workspace_for_patch,
    apply_patch_to_temp_workspace,
    apply_patch_to_project_workspace,
)

SAMPLE_BUGGY_CODE = """def divide(a: float, b: float) -> float:
    # BUG: No division by zero check
    return a / b
"""

SAMPLE_PATCH_DIFF = """--- a/calculator.py
+++ b/calculator.py
@@ -1,3 +1,5 @@
 def divide(a: float, b: float) -> float:
-    # BUG: No division by zero check
+    if b == 0:
+        raise ValueError("Cannot divide by zero")
     return a / b
"""

UNRELATED_PATCH_DIFF = """--- a/unrelated.py
+++ b/unrelated.py
@@ -1,1 +1,2 @@
+# Some injected code
"""

SYNTAX_ERROR_DIFF = """--- a/calculator.py
+++ b/calculator.py
@@ -1,3 +1,4 @@
 def divide(a: float, b: float) -> float:
+    if b == 0
     return a / b
"""


@pytest.fixture
def project_workspace():
    """Create a temporary project workspace with initial source files."""
    temp_dir = Path(tempfile.mkdtemp(prefix="test_autopatch_ws_"))
    calc_file = temp_dir / "calculator.py"
    calc_file.write_text(SAMPLE_BUGGY_CODE, encoding="utf-8")

    readme = temp_dir / "README.md"
    readme.write_text("# Test Project\n", encoding="utf-8")

    yield temp_dir

    if temp_dir.exists():
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_pristine_snapshot_and_isolation(project_workspace):
    """
    Verify:
    1. Pristine snapshot captures SHA-256 hashes of all initial files.
    2. Generating/applying a patch to a temp sandbox leaves original files 100% untouched.
    """
    initial_manifest = create_pristine_snapshot(project_workspace)
    assert "calculator.py" in initial_manifest
    assert "README.md" in initial_manifest

    # Step 1: Create isolated temporary workspace copy
    temp_ws = create_temp_workspace_for_patch(project_workspace, "patch-uuid-123")
    assert temp_ws.exists()
    assert (temp_ws / "calculator.py").exists()

    # Step 2: Apply patch only to the temp copy
    apply_patch_to_temp_workspace(temp_ws, "calculator.py", SAMPLE_PATCH_DIFF)

    # Verify temp workspace code was modified
    patched_content = (temp_ws / "calculator.py").read_text(encoding="utf-8")
    assert 'raise ValueError("Cannot divide by zero")' in patched_content

    # CRITICAL CHECK: Verify original project workspace is 100% UNCHANGED
    original_hashes_after = get_workspace_hashes(project_workspace)
    assert original_hashes_after == initial_manifest
    assert (project_workspace / "calculator.py").read_text(encoding="utf-8") == SAMPLE_BUGGY_CODE

    # Cleanup temp sandbox
    shutil.rmtree(temp_ws, ignore_errors=True)


def test_reject_unrelated_files_and_syntax_errors(project_workspace):
    """
    Verify that:
    1. Patches touching files unrelated to the finding are strictly rejected.
    2. Patches introducing syntax errors are rejected by ast.parse.
    """
    create_pristine_snapshot(project_workspace)
    temp_ws = create_temp_workspace_for_patch(project_workspace, "patch-security-test")

    # 1. Unrelated file modification rejected
    with pytest.raises(ValueError, match="Attempted to modify unrelated file"):
        apply_patch_to_temp_workspace(temp_ws, "calculator.py", UNRELATED_PATCH_DIFF)

    # 2. Syntax error rejected
    with pytest.raises(ValueError, match="syntax error"):
        apply_patch_to_temp_workspace(temp_ws, "calculator.py", SYNTAX_ERROR_DIFF)

    shutil.rmtree(temp_ws, ignore_errors=True)


def test_accept_changes_project_and_rollback_restores_identical_hashes(project_workspace):
    """
    Verify full lifecycle:
    1. Pristine snapshot recorded with file hashes.
    2. 'Accept' applies the validated patch to the project workspace.
    3. Hashes reflect modification.
    4. 'Rollback' physically restores pristine snapshot, restoring exact identical hashes.
    """
    initial_manifest = create_pristine_snapshot(project_workspace)
    initial_calc_hash = initial_manifest["calculator.py"]

    # --- 1. ACCEPT STAGE ---
    apply_patch_to_project_workspace(project_workspace, "calculator.py", SAMPLE_PATCH_DIFF)

    post_accept_hashes = get_workspace_hashes(project_workspace)
    new_calc_hash = post_accept_hashes["calculator.py"]

    # File must be changed and have a different hash
    assert new_calc_hash != initial_calc_hash
    assert 'raise ValueError("Cannot divide by zero")' in (project_workspace / "calculator.py").read_text(encoding="utf-8")

    # --- 2. ROLLBACK STAGE ---
    restored_hashes = restore_workspace_from_snapshot(project_workspace)

    # Verify identical hashes restored
    assert restored_hashes == initial_manifest
    assert restored_hashes["calculator.py"] == initial_calc_hash

    # Verify exact file content matches original
    restored_code = (project_workspace / "calculator.py").read_text(encoding="utf-8")
    assert restored_code == SAMPLE_BUGGY_CODE
