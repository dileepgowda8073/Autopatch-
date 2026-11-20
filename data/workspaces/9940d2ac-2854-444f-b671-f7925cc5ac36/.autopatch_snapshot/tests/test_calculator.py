"""
Tests for average_marks().

Demo moment:
  - test_valid_* pass both before and after the patch (regression safety).
  - test_invalid_* FAIL before the patch (bugs exist) and PASS after (bugs fixed).
"""
import pytest
from marks.calculator import average_marks


# ── Tests that must pass BEFORE and AFTER the patch ───────────────────────
class TestValidInputs:
    def test_typical_marks(self):
        """Normal case: [70, 80, 90] → 80.0"""
        assert average_marks([70, 80, 90]) == pytest.approx(80.0)

    def test_boundary_marks(self):
        """Boundary values: [0, 100] → 50.0"""
        assert average_marks([0, 100]) == pytest.approx(50.0)

    def test_single_mark(self):
        """Single valid mark returns itself."""
        assert average_marks([75]) == pytest.approx(75.0)

    def test_all_same(self):
        """All identical marks."""
        assert average_marks([50, 50, 50]) == pytest.approx(50.0)


# ── Tests that FAIL before the patch and PASS after ───────────────────────
class TestInvalidInputs:
    def test_empty_list_raises(self):
        """BUG 1: Empty list must raise ValueError, not ZeroDivisionError."""
        with pytest.raises(ValueError, match="empty"):
            average_marks([])

    def test_negative_mark_raises(self):
        """BUG 2: Mark below 0 must raise ValueError."""
        with pytest.raises(ValueError, match="range"):
            average_marks([-5, 50])

    def test_mark_above_100_raises(self):
        """BUG 2: Mark above 100 must raise ValueError."""
        with pytest.raises(ValueError, match="range"):
            average_marks([50, 105])

    def test_all_invalid_raises(self):
        """All marks out of range must raise ValueError."""
        with pytest.raises(ValueError):
            average_marks([-10, 200])
