def build_analysis_prompt(file_path: str, code_content: str, warnings: list[dict]) -> str:
    return f"""You are the AutoPatch Autonomous Bug Detection Engine.
Analyze the following source code and any static analyzer warnings to identify concrete logical bugs, unhandled edge cases, boundary violations, or runtime exceptions.

TARGET FILE: {file_path}

SOURCE CODE:
```
{code_content}
```

STATIC WARNINGS DETECTED:
{warnings}

REQUIREMENTS:
1. Identify true logical bugs and boundary defects.
2. Return ONLY a JSON object with a list of "findings".
3. Each finding must strictly adhere to this schema:
   - "file": string (exact file path)
   - "line_start": int (1-indexed start line)
   - "line_end": int (1-indexed end line)
   - "title": string (concise bug title)
   - "description": string (clear explanation of what goes wrong)
   - "trigger": string (condition under which bug manifests)
   - "repro_input": string (exact reproduction function call or parameter input)
   - "expected": string (expected behavior / output / exception)
   - "actual": string (actual buggy behavior / output / exception)
   - "root_cause": string (why the defect exists in the code)
   - "severity": "Critical" | "High" | "Medium" | "Low"
   - "severity_reason": string (justification for assigned severity)
   - "confidence_estimate": float (0.0 to 1.0 estimate)
"""


def build_patch_prompt(file_path: str, code_content: str, finding: dict, failure_feedback: str | None = None) -> str:
    feedback_section = ""
    if failure_feedback:
        feedback_section = f"""
PRIOR PATCH ATTEMPT FAILED TESTS:
Feedback / Traceback:
{failure_feedback}
Please adjust your patch proposal to resolve these test failures without introducing regressions.
"""

    return f"""You are the AutoPatch Patch Synthesis Engine.
Generate the SMALLEST, MOST FOCUSED minimal patch to fix the reported bug without refactoring unrelated code.

TARGET FILE: {file_path}

ORIGINAL SOURCE CODE:
```
{code_content}
```

BUG REPORT TO FIX:
Title: {finding.get('title')}
Description: {finding.get('description')}
Trigger: {finding.get('trigger')}
Expected: {finding.get('expected')}
Actual: {finding.get('actual')}
Root cause: {finding.get('root_cause')}
{feedback_section}

REQUIREMENTS:
1. Return ONLY a valid JSON object with:
   - "diff": string (standard unified diff format starting with --- a/ and +++ b/)
   - "explanation": string (plain-language summary of each line changed)
   - "line_changes": list of objects [{{"line": int, "action": "add"|"remove", "content": string}}]
2. Never rewrite the whole project or file; only modify the minimal necessary lines.
"""
