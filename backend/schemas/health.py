from pydantic import BaseModel


class HealthMetricsOut(BaseModel):
    project_id: str
    total_bugs: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    files_affected: int
    tests_passed: int
    tests_failed: int
    bugs_fixed: int
    bugs_remaining: int
    security_findings: int
