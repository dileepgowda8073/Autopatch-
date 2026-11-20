package marks;

import org.junit.jupiter.api.Test;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {

    // Valid inputs: pass before and after patch
    @Test
    public void testTypicalMarks() {
        assertEquals(80.0, Calculator.averageMarks(Arrays.asList(70.0, 80.0, 90.0)), 0.001);
    }

    @Test
    public void testBoundaryMarks() {
        assertEquals(50.0, Calculator.averageMarks(Arrays.asList(0.0, 100.0)), 0.001);
    }

    // Invalid inputs: fail before patch, pass after patch
    @Test
    public void testEmptyListThrowsIllegalArgument() {
        assertThrows(IllegalArgumentException.class, () -> {
            Calculator.averageMarks(Collections.emptyList());
        });
    }

    @Test
    public void testNegativeMarkThrowsIllegalArgument() {
        assertThrows(IllegalArgumentException.class, () -> {
            Calculator.averageMarks(Arrays.asList(-5.0, 50.0));
        });
    }

    @Test
    public void testAbove100ThrowsIllegalArgument() {
        assertThrows(IllegalArgumentException.class, () -> {
            Calculator.averageMarks(Arrays.asList(50.0, 105.0));
        });
    }
}
