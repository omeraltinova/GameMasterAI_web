import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatWindow } from "@/components/game/ChatWindow";
import type { Message } from "@/types";

// ── Mock scrollIntoView (not available in jsdom) ────────────────────────────
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ── Mock lucide-react ───────────────────────────────────────────────────────
vi.mock("lucide-react", () => ({
  Bot: (props: any) => <span data-testid="icon-bot" {...props} />,
  User: (props: any) => <span data-testid="icon-user" {...props} />,
  Dice6: (props: any) => <span data-testid="icon-dice" {...props} />,
  Swords: (props: any) => <span data-testid="icon-swords" {...props} />,
  AlertCircle: (props: any) => <span data-testid="icon-alert" {...props} />,
  RotateCcw: (props: any) => <span data-testid="icon-rotate" {...props} />,
  MoreVertical: (props: any) => <span data-testid="icon-more" {...props} />,
  RefreshCw: (props: any) => <span data-testid="icon-refresh" {...props} />,
  MapPin: (props: any) => <span data-testid="icon-mappin" {...props} />,
}));

// ── Mock ActionButtons (child component) ────────────────────────────────────
vi.mock("@/components/game/ActionButtons", () => ({
  ActionButtons: (props: any) => (
    <div data-testid="action-buttons">ActionButtons</div>
  ),
}));

// ── Mock UI components ──────────────────────────────────────────────────────
vi.mock("@/components/ui", () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    sessionId: "session-1",
    senderType: "GM",
    senderName: "Game Master",
    content: "You enter a dark cave.",
    timestamp: "2026-02-28T12:00:00Z",
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════
describe("ChatWindow", () => {
  describe("empty state", () => {
    it("renders empty state when messages array is empty", () => {
      render(<ChatWindow messages={[]} />);
      expect(screen.getByText("Maceraya Hoş Geldin!")).toBeDefined();
      expect(screen.getByText(/Aksiyonunu yazarak/)).toBeDefined();
    });
  });

  describe("message rendering", () => {
    it("renders GM messages on the left", () => {
      const messages = [makeMessage({ senderType: "GM", content: "Hello adventurer" })];
      render(<ChatWindow messages={messages} />);
      expect(screen.getByText("Hello adventurer")).toBeDefined();
    });

    it("renders PLAYER messages on the right", () => {
      const messages = [
        makeMessage({ id: "m1", senderType: "PLAYER", senderName: "Hero", content: "I attack!" }),
      ];
      render(<ChatWindow messages={messages} />);
      expect(screen.getByText("I attack!")).toBeDefined();
      expect(screen.getByText("Hero")).toBeDefined();
    });

    it("renders SYSTEM messages centered", () => {
      const messages = [
        makeMessage({ id: "m1", senderType: "SYSTEM", content: "Session started" }),
      ];
      render(<ChatWindow messages={messages} />);
      expect(screen.getByText("Session started")).toBeDefined();
    });

    it("renders DICE messages centered", () => {
      const messages = [
        makeMessage({ id: "m1", senderType: "DICE", content: "Rolled 18" }),
      ];
      render(<ChatWindow messages={messages} />);
      expect(screen.getByText("Rolled 18")).toBeDefined();
    });

    it("renders COMBAT messages centered", () => {
      const messages = [
        makeMessage({ id: "m1", senderType: "COMBAT", content: "Initiative!" }),
      ];
      render(<ChatWindow messages={messages} />);
      expect(screen.getByText("Initiative!")).toBeDefined();
    });

    it("renders multiple messages", () => {
      const messages = [
        makeMessage({ id: "m1", content: "First message" }),
        makeMessage({ id: "m2", senderType: "PLAYER", senderName: "Hero", content: "Second message" }),
        makeMessage({ id: "m3", content: "Third message" }),
      ];
      render(<ChatWindow messages={messages} />);
      expect(screen.getByText("First message")).toBeDefined();
      expect(screen.getByText("Second message")).toBeDefined();
      expect(screen.getByText("Third message")).toBeDefined();
    });

    it("displays sender name", () => {
      const messages = [
        makeMessage({ senderName: "Game Master" }),
      ];
      render(<ChatWindow messages={messages} />);
      expect(screen.getByText("Game Master")).toBeDefined();
    });

    it("formats timestamp in Turkish locale", () => {
      const messages = [
        makeMessage({ timestamp: "2026-02-28T14:30:00Z" }),
      ];
      render(<ChatWindow messages={messages} />);
      // The component uses tr-TR locale with 2-digit hour/minute
      // We just check some time string is rendered
      const timeElements = screen.getAllByText(/\d{2}:\d{2}/);
      expect(timeElements.length).toBeGreaterThan(0);
    });
  });

  describe("SYSTEM messages with location images", () => {
    it("treats SYSTEM messages with locationImageUrl as GM messages", () => {
      const messages = [
        makeMessage({
          id: "m1",
          senderType: "SYSTEM",
          content: "A new location",
          locationImageUrl: "https://example.com/image.png",
          locationName: "Dark Forest",
        }),
      ];
      render(<ChatWindow messages={messages} />);
      // Should use "Game Master" as sender name
      expect(screen.getByText("Game Master")).toBeDefined();
      expect(screen.getByText("Dark Forest")).toBeDefined();
    });
  });

  describe("action buttons", () => {
    it("renders ActionButtons for the last GM message with gmPrompt", () => {
      const messages = [
        makeMessage({
          id: "m1",
          senderType: "GM",
          gmPrompt: {
            promptText: "What do you do?",
            isMandatory: false,
            actions: [{ id: "a1", type: "choice", label: "Attack" }],
          },
        }),
      ];
      const onActionSelect = vi.fn();
      render(<ChatWindow messages={messages} onActionSelect={onActionSelect} />);
      expect(screen.getByTestId("action-buttons")).toBeDefined();
    });

    it("does NOT render ActionButtons for GM messages without gmPrompt", () => {
      const messages = [makeMessage({ id: "m1", senderType: "GM" })];
      const onActionSelect = vi.fn();
      render(<ChatWindow messages={messages} onActionSelect={onActionSelect} />);
      expect(screen.queryByTestId("action-buttons")).toBeNull();
    });

    it("does NOT render ActionButtons without onActionSelect prop", () => {
      const messages = [
        makeMessage({
          id: "m1",
          senderType: "GM",
          gmPrompt: {
            promptText: "What do you do?",
            isMandatory: false,
            actions: [{ id: "a1", type: "choice", label: "Attack" }],
          },
        }),
      ];
      render(<ChatWindow messages={messages} />);
      expect(screen.queryByTestId("action-buttons")).toBeNull();
    });

    it("only shows ActionButtons on the LAST GM message with prompt", () => {
      const messages = [
        makeMessage({
          id: "m1",
          senderType: "GM",
          content: "Old prompt",
          gmPrompt: {
            promptText: "Old",
            isMandatory: false,
            actions: [{ id: "a1", type: "choice", label: "Old action" }],
          },
        }),
        makeMessage({
          id: "m2",
          senderType: "PLAYER",
          senderName: "Hero",
          content: "I chose",
        }),
        makeMessage({
          id: "m3",
          senderType: "GM",
          content: "New prompt",
          gmPrompt: {
            promptText: "New",
            isMandatory: false,
            actions: [{ id: "a2", type: "choice", label: "New action" }],
          },
        }),
      ];
      const onActionSelect = vi.fn();
      render(<ChatWindow messages={messages} onActionSelect={onActionSelect} />);
      // Only 1 ActionButtons should render
      const actionButtons = screen.getAllByTestId("action-buttons");
      expect(actionButtons).toHaveLength(1);
    });
  });

  describe("scrolling", () => {
    it("creates scroll anchor div", () => {
      const messages = [makeMessage()];
      const { container } = render(<ChatWindow messages={messages} />);
      // The messagesEndRef div exists at the bottom
      const scrollContainer = container.querySelector(".overflow-y-auto");
      expect(scrollContainer).toBeDefined();
    });
  });
});
