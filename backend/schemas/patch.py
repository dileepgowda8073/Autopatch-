from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LineChange(BaseModel):
    line: int
    action: str  # add | remove | context
    content: str


class PatchOut(BaseModel):
    id: str
    finding_id: str
    diff: str
    explanation: str
    attempt: int
    line_changes: list[LineChange]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatchCreateIn(BaseModel):
    finding_id: str | None = None
    force_regenerate: bool = False
