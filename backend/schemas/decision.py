from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DecisionIn(BaseModel):
    decision: str  # accept | reject | needs_review
    note: str | None = None


class DecisionOut(BaseModel):
    id: str
    patch_id: str
    decision: str
    note: str | None
    decided_at: datetime
    download_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RollbackOut(BaseModel):
    patch_id: str
    rolled_back_at: datetime
    message: str
