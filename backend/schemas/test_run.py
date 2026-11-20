from pydantic import BaseModel, ConfigDict


class TestRunOut(BaseModel):
    id: str
    patch_id: str
    phase: str
    exit_code: int
    passed: int
    failed: int
    status: str
    reason: str | None
    raw_output: str
    duration_ms: int

    model_config = ConfigDict(from_attributes=True)


class ValidationResultOut(BaseModel):
    patch_id: str
    overall_status: str
    phases: list[TestRunOut]
