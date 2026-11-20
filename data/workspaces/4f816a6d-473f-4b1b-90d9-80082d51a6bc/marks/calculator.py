# marks/calculator.py
# INTENTIONAL BUGS for AutoPatch demo:
#   Bug 1: ZeroDivisionError when marks is an empty list
#   Bug 2: Accepts marks outside the valid range 0-100 without raising
# Input contract: non-empty list of numbers, each between 0 and 100 inclusive.


def average_marks(marks):
    """Return the average of a list of exam marks.

    Args:
        marks: A non-empty list of numbers, each in the range [0, 100].

    Returns:
        The arithmetic mean of the marks as a float.

    Raises:
        ValueError: If marks is empty or any mark is outside [0, 100].
    """
    # BUG 1: No guard for empty list → ZeroDivisionError
    # BUG 2: No validation of mark range → silent wrong results
    return sum(marks) / len(marks)
