package marks;

import java.util.List;

public class Calculator {

    /**
     * Return arithmetic mean of marks.
     * BUGS:
     *   1. Empty list causes ArithmeticException or NaN
     *   2. Does not validate marks within [0, 100]
     */
    public static double averageMarks(List<Double> marks) {
        if (marks.isEmpty()) {
            throw new ArithmeticException("Division by zero on empty marks");
        }
        double sum = 0.0;
        for (double m : marks) {
            sum += m;
        }
        return sum / marks.size();
    }
}
