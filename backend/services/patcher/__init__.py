from backend.services.patcher.patch_engine import (
    create_pristine_snapshot,
    restore_workspace_from_snapshot,
    get_workspace_hashes,
    create_temp_workspace_for_patch,
    apply_patch_to_temp_workspace,
    apply_patch_to_project_workspace,
    apply_patch_to_string,
    verify_syntax,
    extract_files_from_unified_diff,
)

__all__ = [
    "create_pristine_snapshot",
    "restore_workspace_from_snapshot",
    "get_workspace_hashes",
    "create_temp_workspace_for_patch",
    "apply_patch_to_temp_workspace",
    "apply_patch_to_project_workspace",
    "apply_patch_to_string",
    "verify_syntax",
    "extract_files_from_unified_diff",
]
