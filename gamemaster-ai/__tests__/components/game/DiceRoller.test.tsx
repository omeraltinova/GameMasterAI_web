import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DiceRoller } from "@/components/game/DiceRoller";

// ── Mock lucide-react icons (they render as simple spans) ───────────────────
vi.mock("lucide-react", () => ({
  Dice1: (props: any) => <span data-testid="icon-dice1" {...props} />,
  Dice2: (props: any) => <span data-testid="icon-dice2" {...props} />,
  Dice3: (props: any) => <span data-testid="icon-dice3" {...props} />,
  Dice4: (props: any) => <span data-testid="icon-dice4" {...props} />,
  Dice5: (props: any) => <span data-testid="icon-dice5" {...props} />,
  Dice6: (props: any) => <span data-testid="icon-dice6" {...props} />,
  Sparkles: (props: any) => <span data-testid="icon-sparkles" {...props} />,
  AlertTriangle: (props: any) => <span data-testid="icon-alert" {...props} />,
}));

// ── Mock UI components ──────────────────────────────────────────────────────
vi.mock("@/components/ui", () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Badge: ({ children, variant, ...props }: any) => (
    <span data-variant={variant} {...props}>{children}</span>
  ),
}));

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════
describe("DiceRoller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders all 7 dice type buttons", () => {
    render(<DiceRoller />);
    const diceLabels = ["D4", "D6", "D8", "D10", "D12", "D20", "D100"];
    for (const label of diceLabels) {
      expect(screen.getByText(label)).toBeDefined();
    }
  });

  it("renders count and modifier controls", () => {
    render(<DiceRoller />);
    // "Adet" label
    expect(screen.getByText("Adet")).toBeDefined();
    // "Modifier" label
    expect(screen.getByText("Modifier")).toBeDefined();
  });

  it("defaults to d20 selected", () => {
    render(<DiceRoller />);
    // The roll button should say "1d20 At"
    expect(screen.getByText(/1d20 At/)).toBeDefined();
  });

  it("updates dice type when clicking a dice button", () => {
    render(<DiceRoller />);
    fireEvent.click(screen.getByText("D6"));
    expect(screen.getByText(/1d6 At/)).toBeDefined();
  });

  it("increments count when + is clicked", () => {
    render(<DiceRoller />);
    // Select d6 first so advantage mode buttons don't show
    fireEvent.click(screen.getByText("D6"));
    // Find the + buttons; first pair is count, second is modifier
    const plusButtons = screen.getAllByText("+");
    fireEvent.click(plusButtons[0]); // count +
    expect(screen.getByText(/2d6 At/)).toBeDefined();
  });

  it("decrements count but not below 1", () => {
    render(<DiceRoller />);
    fireEvent.click(screen.getByText("D6"));
    const minusButtons = screen.getAllByText("-");
    fireEvent.click(minusButtons[0]); // count - (already 1)
    expect(screen.getByText(/1d6 At/)).toBeDefined();
  });

  it("count does not exceed 10", () => {
    render(<DiceRoller />);
    fireEvent.click(screen.getByText("D6"));
    const plusButtons = screen.getAllByText("+");
    for (let i = 0; i < 12; i++) {
      fireEvent.click(plusButtons[0]);
    }
    // Count should be capped at 10
    expect(screen.getByText(/10d6 At/)).toBeDefined();
  });

  it("adjusts modifier up and down", () => {
    render(<DiceRoller />);
    fireEvent.click(screen.getByText("D6"));
    const plusButtons = screen.getAllByText("+");
    const minusButtons = screen.getAllByText("-");

    // Increase modifier (second + button)
    fireEvent.click(plusButtons[1]);
    fireEvent.click(plusButtons[1]);
    // +2 appears in both the modifier display and the roll button
    const plus2Elements = screen.getAllByText("+2");
    expect(plus2Elements.length).toBeGreaterThanOrEqual(1);

    // Decrease modifier
    fireEvent.click(minusButtons[1]);
    fireEvent.click(minusButtons[1]);
    fireEvent.click(minusButtons[1]);
    // Now modifier is -1; appears in modifier display and roll button
    const minus1Elements = screen.getAllByText("-1");
    expect(minus1Elements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows advantage/disadvantage buttons only for d20 with count=1", () => {
    render(<DiceRoller />);
    // d20 + count 1 → should show roll mode buttons
    expect(screen.getByText("Normal")).toBeDefined();
    expect(screen.getByText("Avantaj")).toBeDefined();
    expect(screen.getByText("Dezavantaj")).toBeDefined();
  });

  it("hides advantage/disadvantage for non-d20 dice", () => {
    render(<DiceRoller />);
    fireEvent.click(screen.getByText("D6"));
    expect(screen.queryByText("Avantaj")).toBeNull();
  });

  it("hides advantage/disadvantage when count > 1 for d20", () => {
    render(<DiceRoller />);
    // d20 is already selected; increment count to 2
    const plusButtons = screen.getAllByText("+");
    fireEvent.click(plusButtons[0]);
    expect(screen.queryByText("Avantaj")).toBeNull();
  });

  it("shows 'Atılıyor...' while rolling", () => {
    render(<DiceRoller />);
    fireEvent.click(screen.getByText(/d20 At/));
    expect(screen.getByText("Atılıyor...")).toBeDefined();
  });

  it("calls onRoll callback after roll completes", () => {
    const onRoll = vi.fn();
    render(<DiceRoller onRoll={onRoll} />);

    fireEvent.click(screen.getByText(/d20 At/));
    expect(onRoll).not.toHaveBeenCalled();

    // Advance past the 500ms setTimeout
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(onRoll).toHaveBeenCalledTimes(1);
    // onRoll(diceType, count, modifier, results, rollMode)
    const [diceType, count, modifier, results, rollMode] = onRoll.mock.calls[0];
    expect(diceType).toBe("d20");
    expect(count).toBe(1);
    expect(modifier).toBe(0);
    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("displays result after rolling", () => {
    render(<DiceRoller />);

    fireEvent.click(screen.getByText(/d20 At/));
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Should show "= <total>"
    expect(screen.getByText(/^=/)).toBeDefined();
  });

  it("shows two dice results for advantage roll", () => {
    const onRoll = vi.fn();
    render(<DiceRoller onRoll={onRoll} />);

    // Click "Avantaj"
    fireEvent.click(screen.getByText("Avantaj"));
    fireEvent.click(screen.getByText(/d20 At/));

    act(() => {
      vi.advanceTimersByTime(600);
    });

    // The results array should have 2 items for advantage
    const results = onRoll.mock.calls[0][3];
    expect(results).toHaveLength(2);
  });

  it("works correctly without onRoll prop", () => {
    render(<DiceRoller />);

    fireEvent.click(screen.getByText(/d20 At/));
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Should not throw and should display result
    expect(screen.getByText(/^=/)).toBeDefined();
  });
});
