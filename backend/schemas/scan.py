from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ScanOut(BaseModel):
    id: str
    project_id: str
    status: str
    tool_versions: dict[str, str]
    started_at: datetime
    finished_at: datetime | None
    job_id: str
    stream_url: str

    model_config = ConfigDict(from_attributes=True)


class ScanStartResponse(BaseModel):
    id: str
    job_id: str
    scan_id: str
    status: str
    stream_url: str
