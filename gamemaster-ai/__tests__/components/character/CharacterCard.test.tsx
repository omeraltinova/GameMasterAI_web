import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CharacterCard } from "@/components/character/CharacterCard";
import type { Character } from "@/types";

// ── Mock Next.js Link ───────────────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ── Mock lucide-react ───────────────────────────────────────────────────────
vi.mock("lucide-react", () => ({
  Heart: (props: any) => <span data-testid="icon-heart" {...props} />,
  Shield: (props: any) => <span data-testid="icon-shield" {...props} />,
  Sparkles: (props: any) => <span data-testid="icon-sparkles" {...props} />,
}));

// ── Mock UI components ──────────────────────────────────────────────────────
vi.mock("@/components/ui", () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Badge: ({ children, variant, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} {...props}>{children}</span>
  ),
  Avatar: ({ fallback, ...props }: any) => (
    <div data-testid="avatar" {...props}>{fallback}</div>
  ),
  Progress: ({ value, max, variant, ...props }: any) => (
    <div data-testid="progress" data-value={value} data-max={max} data-variant={variant} {...props} />
  ),
}));

// ── Helper ──────────────────────────────────────────────────────────────────
function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "char-1",
    userId: "user-1",
    name: "Alderan",
    race: "Human",
    class: "Wizard",
    level: 5,
    experience: 2500,
    hp: 28,
    maxHp: 40,
    stats: {
      strength: 10,
      dexterity: 14,
      constitution: 12,
      intelligence: 18,
      wisdom: 16,
      charisma: 13,
    },
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
    ...overrides,
  } as Character;
}

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════
describe("CharacterCard", () => {
  it("renders character name", () => {
    render(<CharacterCard character={makeCharacter()} />);
    // Name appears in both avatar fallback and heading
    const matches = screen.getAllByText("Alderan");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders race and class", () => {
    render(<CharacterCard character={makeCharacter()} />);
    expect(screen.getByText("Human Wizard")).toBeDefined();
  });

  it("renders level badge", () => {
    render(<CharacterCard character={makeCharacter({ level: 10 })} />);
    expect(screen.getByText("Lv.10")).toBeDefined();
  });

  it("renders HP bar with correct values", () => {
    render(<CharacterCard character={makeCharacter({ hp: 28, maxHp: 40 })} />);
    expect(screen.getByText("28/40")).toBeDefined();
  });

  it("renders HP Progress with danger variant when hp < 33%", () => {
    render(<CharacterCard character={makeCharacter({ hp: 10, maxHp: 100 })} />);
    const hpProgress = screen.getAllByTestId("progress")[0];
    expect(hpProgress.getAttribute("data-variant")).toBe("danger");
  });

  it("renders HP Progress with warning variant when hp between 33% and 66%", () => {
    render(<CharacterCard character={makeCharacter({ hp: 50, maxHp: 100 })} />);
    const hpProgress = screen.getAllByTestId("progress")[0];
    expect(hpProgress.getAttribute("data-variant")).toBe("warning");
  });

  it("renders HP Progress with success variant when hp >= 66%", () => {
    render(<CharacterCard character={makeCharacter({ hp: 80, maxHp: 100 })} />);
    const hpProgress = screen.getAllByTestId("progress")[0];
    expect(hpProgress.getAttribute("data-variant")).toBe("success");
  });

  it("calculates and displays AC (10 + DEX modifier)", () => {
    // DEX 14 → modifier +2 → AC = 12
    render(<CharacterCard character={makeCharacter()} />);
    expect(screen.getByText("12")).toBeDefined(); // AC value
  });

  it("calculates and displays STR modifier", () => {
    // STR 10 → modifier +0
    render(<CharacterCard character={makeCharacter()} />);
    expect(screen.getByText("+0")).toBeDefined(); // STR modifier
  });

  it("calculates and displays DEX modifier", () => {
    // DEX 14 → modifier +2
    render(<CharacterCard character={makeCharacter()} />);
    expect(screen.getByText("+2")).toBeDefined(); // DEX modifier
  });

  it("links to the character detail page", () => {
    const { container } = render(
      <CharacterCard character={makeCharacter({ id: "char-42" })} />
    );
    const link = container.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/characters/char-42");
  });

  it("displays XP value", () => {
    render(<CharacterCard character={makeCharacter({ experience: 2500 })} />);
    // toLocaleString in Turkish locale uses '.' as thousands separator → "2.500"
    expect(screen.getByText("2.500")).toBeDefined();
  });

  it("displays stat labels", () => {
    render(<CharacterCard character={makeCharacter()} />);
    expect(screen.getByText("AC")).toBeDefined();
    expect(screen.getByText("STR")).toBeDefined();
    expect(screen.getByText("DEX")).toBeDefined();
  });

  it("renders avatar with character name as fallback", () => {
    render(<CharacterCard character={makeCharacter({ name: "Silvarin" })} />);
    const avatar = screen.getByTestId("avatar");
    expect(avatar.textContent).toBe("Silvarin");
  });

  it("handles negative modifiers correctly", () => {
    // STR 8 → modifier -1
    render(
      <CharacterCard
        character={makeCharacter({
          stats: {
            strength: 8,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
            wisdom: 10,
            charisma: 10,
          },
        })}
      />
    );
    expect(screen.getByText("-1")).toBeDefined();
  });
});
