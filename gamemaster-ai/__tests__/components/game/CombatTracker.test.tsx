import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CombatTracker } from "@/components/game/CombatTracker";
import type { Combat, CombatParticipant } from "@/types";

// ── Mock lucide-react ───────────────────────────────────────────────────────
vi.mock("lucide-react", () => ({
    Swords: (props: any) => <span data-testid="icon-swords" {...props} />,
    Shield: (props: any) => <span data-testid="icon-shield" {...props} />,
    Heart: (props: any) => <span data-testid="icon-heart" {...props} />,
    ChevronRight: (props: any) => <span data-testid="icon-chevron" {...props} />,
    SkipForward: (props: any) => <span data-testid="icon-skip" {...props} />,
    Trophy: (props: any) => <span data-testid="icon-trophy" {...props} />,
    Skull: (props: any) => <span data-testid="icon-skull" {...props} />,
    User: (props: any) => <span data-testid="icon-user" {...props} />,
    Users: (props: any) => <span data-testid="icon-users" {...props} />,
    X: (props: any) => <span data-testid="icon-x" {...props} />,
}));

// ── Mock UI components ──────────────────────────────────────────────────────
vi.mock("@/components/ui", () => ({
    Card: ({ children, className, ...props }: any) => (
        <div data-testid="card" className={className} {...props}>{children}</div>
    ),
    CardContent: ({ children, ...props }: any) => (
        <div data-testid="card-content" {...props}>{children}</div>
    ),
    Badge: ({ children, variant, ...props }: any) => (
        <span data-testid="badge" data-variant={variant} {...props}>{children}</span>
    ),
    Progress: ({ value, max, variant, ...props }: any) => (
        <div data-testid="progress" data-value={value} data-max={max} data-variant={variant} {...props} />
    ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeParticipant(overrides: Partial<CombatParticipant> = {}): CombatParticipant {
    return {
        id: "p1",
        type: "player",
        name: "Alderan",
        initiative: 18,
        hp: 30,
        maxHp: 40,
        ac: 15,
        ...overrides,
    };
}

function makeCombat(overrides: Partial<Combat> = {}): Combat {
    const participants: CombatParticipant[] = [
        makeParticipant({ id: "p1", name: "Alderan", type: "player", initiative: 18, hp: 30, maxHp: 40, ac: 15 }),
        makeParticipant({ id: "e1", name: "Goblin", type: "enemy", initiative: 12, hp: 7, maxHp: 7, ac: 12 }),
        makeParticipant({ id: "a1", name: "Guard", type: "ally", initiative: 10, hp: 20, maxHp: 20, ac: 16 }),
    ];

    return {
        id: "combat-1",
        sessionId: "session-1",
        participants,
        turnOrder: participants,
        currentTurn: 0,
        round: 1,
        status: "active",
        log: [],
        createdAt: "2026-01-01T00:00:00Z",
        ...overrides,
    };
}

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════
describe("CombatTracker", () => {
    it("renders the combat header with round number", () => {
        render(<CombatTracker combat={makeCombat({ round: 3 })} />);
        expect(screen.getByText("Savaş")).toBeDefined();
        expect(screen.getByText("Round 3")).toBeDefined();
    });

    it("shows participant count", () => {
        render(<CombatTracker combat={makeCombat()} />);
        expect(screen.getByText("3 katılımcı")).toBeDefined();
    });

    it("renders all participant names", () => {
        render(<CombatTracker combat={makeCombat()} />);
        // Alderan appears in both turn banner and list
        expect(screen.getAllByText("Alderan").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Goblin")).toBeDefined();
        expect(screen.getByText("Guard")).toBeDefined();
    });

    it("shows current turn indicator", () => {
        render(<CombatTracker combat={makeCombat()} />);
        // "Sıra:" label and the current participant name
        expect(screen.getByText("Sıra:")).toBeDefined();
    });

    it("displays HP values for participants", () => {
        render(<CombatTracker combat={makeCombat()} />);
        // HP values are rendered as "30/40" etc. inside spans
        expect(screen.getByText("30", { exact: false })).toBeDefined();
        expect(screen.getByText("7", { exact: false })).toBeDefined();
    });

    it("displays AC values for participants", () => {
        render(<CombatTracker combat={makeCombat()} />);
        // AC 15 and 16 are unique values in the DOM
        expect(screen.getByText("15")).toBeDefined();
        expect(screen.getByText("16")).toBeDefined();
    });

    it("displays initiative values", () => {
        render(<CombatTracker combat={makeCombat()} />);
        expect(screen.getByText("18")).toBeDefined();
        // 12 and 10 are also shown as initiative values
    });

    it("returns null when combat status is ended", () => {
        const { container } = render(
            <CombatTracker combat={makeCombat({ status: "ended" })} />
        );
        expect(container.innerHTML).toBe("");
    });

    it("shows GM controls when isGameMaster is true", () => {
        render(<CombatTracker combat={makeCombat()} isGameMaster={true} />);
        expect(screen.getByText("Sonraki Sıra")).toBeDefined();
        expect(screen.getByText("Bitir")).toBeDefined();
    });

    it("hides GM controls when isGameMaster is false", () => {
        render(<CombatTracker combat={makeCombat()} isGameMaster={false} />);
        expect(screen.queryByText("Sonraki Sıra")).toBeNull();
        expect(screen.queryByText("Bitir")).toBeNull();
    });

    it("calls onNextTurn when 'Sonraki Sıra' is clicked", () => {
        const onNextTurn = vi.fn();
        render(
            <CombatTracker combat={makeCombat()} isGameMaster={true} onNextTurn={onNextTurn} />
        );
        fireEvent.click(screen.getByText("Sonraki Sıra"));
        expect(onNextTurn).toHaveBeenCalledOnce();
    });

    it("calls onEndCombat when 'Bitir' is clicked", () => {
        const onEndCombat = vi.fn();
        render(
            <CombatTracker combat={makeCombat()} isGameMaster={true} onEndCombat={onEndCombat} />
        );
        fireEvent.click(screen.getByText("Bitir"));
        expect(onEndCombat).toHaveBeenCalledOnce();
    });

    it("collapses and expands on header click", () => {
        render(<CombatTracker combat={makeCombat()} />);

        // Initially expanded — participant names visible
        expect(screen.getAllByText("Alderan").length).toBeGreaterThanOrEqual(1);

        // Click header to collapse
        fireEvent.click(screen.getByText("Savaş"));
        expect(screen.queryByText("Goblin")).toBeNull();

        // Click again to expand
        fireEvent.click(screen.getByText("Savaş"));
        expect(screen.getByText("Goblin")).toBeDefined();
    });

    it("shows danger HP variant for low HP participant", () => {
        const lowHpCombat = makeCombat({
            turnOrder: [makeParticipant({ hp: 5, maxHp: 40 })],
            participants: [makeParticipant({ hp: 5, maxHp: 40 })],
        });
        render(<CombatTracker combat={lowHpCombat} />);
        const progresses = screen.getAllByTestId("progress");
        expect(progresses[0].getAttribute("data-variant")).toBe("danger");
    });

    it("shows success HP variant for full HP participant", () => {
        const fullHpCombat = makeCombat({
            turnOrder: [makeParticipant({ hp: 40, maxHp: 40 })],
            participants: [makeParticipant({ hp: 40, maxHp: 40 })],
        });
        render(<CombatTracker combat={fullHpCombat} />);
        const progresses = screen.getAllByTestId("progress");
        expect(progresses[0].getAttribute("data-variant")).toBe("success");
    });
});
