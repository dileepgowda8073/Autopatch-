from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TreeNode(BaseModel):
    path: str
    type: str  # "file" | "dir"
    size_bytes: int | None = None
    children: list["TreeNode"] | None = None


class ProjectOut(BaseModel):
    id: str
    name: str
    language: str
    language_confidence: float = 1.0
    language_reasons: list[str] = []
    file_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectTreeOut(BaseModel):
    project_id: str
    language: str
    language_confidence: float = 1.0
    language_reasons: list[str] = []
    entry_point: str | None
    tree: list[TreeNode]
    source_file_count: int
    test_files: list[str]
    dependencies: list[str]
    missing_dependencies: list[str]
