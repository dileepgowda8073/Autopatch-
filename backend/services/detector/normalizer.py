from backend.core.interfaces import FindingData, SourceTool, Severity


def normalize_finding(
    file: str,
    line_start: int,
    line_end: int,
    title: str,
    description: str,
    trigger: str,
    repro_input: str,
    expected: str,
    actual: str,
    root_cause: str,
    source: SourceTool,
    severity: Severity,
    severity_reason: str,
    confidence_estimate: float,
    is_candidate: bool | None = None,
    raw_evidence: dict | None = None,
) -> FindingData:
    """Ensure canonical data constraints and honest candidate tagging."""
    # LLM findings are always candidates; deterministic static/test findings are not
    candidate_flag = is_candidate if is_candidate is not None else (source == SourceTool.LLM)

    # Clamping confidence between 0.0 and 1.0
    clamped_confidence = max(0.0, min(1.0, float(confidence_estimate)))

    return FindingData(
        file=file,
        line_start=max(1, line_start),
        line_end=max(line_start, line_end),
        title=title.strip(),
        description=description.strip(),
        trigger=trigger.strip(),
        repro_input=repro_input.strip(),
        expected=expected.strip(),
        actual=actual.strip(),
        root_cause=root_cause.strip(),
        source=source,
        severity=severity,
        severity_reason=severity_reason.strip(),
        confidence_estimate=clamped_confidence,
        is_candidate=candidate_flag,
        raw_evidence=raw_evidence or {},
    )
