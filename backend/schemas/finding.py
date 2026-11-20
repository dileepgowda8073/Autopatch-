from pydantic import BaseModel, ConfigDict, Field


class FindingOut(BaseModel):
    id: str
    scan_id: str
    file: str
    line_start: int
    line_end: int
    title: str
    description: str
    trigger: str
    repro_input: str
    expected: str
    actual: str
    root_cause: str
    source: str
    severity: str
    severity_reason: str
    confidence_estimate: float = Field(ge=0.0, le=1.0)
    is_candidate: bool
    status: str

    model_config = ConfigDict(from_attributes=True)


class FindingsListOut(BaseModel):
    scan_id: str
    total: int
    findings: list[FindingOut]
