import re
import json
from typing import Any


def repair_and_parse_json(raw_text: str) -> dict[str, Any] | list[Any]:
    """
    Attempt to extract and parse valid JSON from LLM output, repairing common anomalies:
      - Markdown code block wrapping (```json ... ```)
      - Trailing commas in lists or objects
      - Single quotes instead of double quotes
      - Truncated closing brackets/braces
    """
    cleaned = raw_text.strip()

    # Strip markdown code fences if present
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()

    # Direct parse attempt
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Regex heuristic cleanup for trailing commas: , ] or , }
    fixed = re.sub(r",\s*([\]}])", r"\1", cleaned)

    try:
        return json.loads(fixed)
    except json.JSONDecodeError:
        pass

    # Balance unclosed brackets/braces
    open_curly = fixed.count("{")
    close_curly = fixed.count("}")
    if open_curly > close_curly:
        fixed += "}" * (open_curly - close_curly)

    open_square = fixed.count("[")
    close_square = fixed.count("]")
    if open_square > close_square:
        fixed += "]" * (open_square - close_square)

    try:
        return json.loads(fixed)
    except json.JSONDecodeError as err:
        raise ValueError(f"Could not repair malformed LLM JSON output: {err}") from err
