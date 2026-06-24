import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    gameSession: { findUnique: vi.fn(), update: vi.fn() },
    combat: { findUnique: vi.fn() },
    message: { create: vi.fn() },
  },
  getUserId: vi.fn(),
  getAIResponseWithContext: vi.fn(),
  checkAIRateLimit: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/auth/server", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/ai/openrouter", () => ({
  getAIResponseWithContext: mocks.getAIResponseWithContext,
}));
vi.mock("@/lib/ai/prompts", () => ({ SYSTEM_PROMPT: "SYS" }));
vi.mock("@/lib/security/aiRateLimit", () => ({ checkAIRateLimit: mocks.checkAIRateLimit }));

import { NextRequest } from "next/server";
import { POST as combatActionNarration } from "@/app/api/gm/combat-action/route";

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/gm/combat-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockResolvedValue("gm-1");
  mocks.checkAIRateLimit.mockResolvedValue({ allowed: true });
  mocks.getAIResponseWithContext.mockResolvedValue("Kılıç düşmana saplanır.");
  mocks.prisma.gameSession.findUnique.mockResolvedValue({
    id: "s1",
    currentState: JSON.stringify({ inCombat: true }),
    campaign: { creatorId: "gm-1", players: [] },
  });
  mocks.prisma.message.create.mockResolvedValue({ id: "msg-1", timestamp: new Date() });
  mocks.prisma.gameSession.update.mockResolvedValue({});
});

describe("POST /api/gm/combat-action — grounded to the real Combat record", () => {
  it("derives inCombat=false from an ended linked combat (no longer forces true)", async () => {
    mocks.prisma.combat.findUnique.mockResolvedValue({ id: "c1", sessionId: "s1", status: "ended" });

    const res = await combatActionNarration(
      makeReq({
        sessionId: "s1",
        action: "Saldırı",
        attacker: "Hero",
        combatId: "c1",
        hit: true,
        damage: 5,
        combatEnded: true,
        targetDefeated: true,
        targetHpRemaining: 0,
      })
    );
    expect(res.status).toBe(200);

    const writtenState = JSON.parse(mocks.prisma.gameSession.update.mock.calls[0][0].data.currentState);
    expect(writtenState.inCombat).toBe(false);

    // The AI prompt is grounded in the real mechanical outcome.
    const userPrompt = mocks.getAIResponseWithContext.mock.calls[0][2] as string;
    expect(userPrompt).toContain("İsabet");
    expect(userPrompt).toContain("Hasar: 5");
  });

  it("keeps inCombat=true while the linked combat is still active", async () => {
    mocks.prisma.combat.findUnique.mockResolvedValue({ id: "c1", sessionId: "s1", status: "active" });

    const res = await combatActionNarration(
      makeReq({ sessionId: "s1", action: "Saldırı", attacker: "Hero", combatId: "c1", hit: false })
    );
    expect(res.status).toBe(200);

    const writtenState = JSON.parse(mocks.prisma.gameSession.update.mock.calls[0][0].data.currentState);
    expect(writtenState.inCombat).toBe(true);
    const userPrompt = mocks.getAIResponseWithContext.mock.calls[0][2] as string;
    expect(userPrompt).toContain("Işkalama");
  });

  it("ignores a combatId that belongs to another session", async () => {
    mocks.prisma.combat.findUnique.mockResolvedValue({ id: "c1", sessionId: "OTHER", status: "ended" });

    const res = await combatActionNarration(
      makeReq({ sessionId: "s1", action: "Saldırı", attacker: "Hero", combatId: "c1" })
    );
    expect(res.status).toBe(200);
    // Falls back to the existing gameState.inCombat (true) since the combat is not linked.
    const writtenState = JSON.parse(mocks.prisma.gameSession.update.mock.calls[0][0].data.currentState);
    expect(writtenState.inCombat).toBe(true);
  });
});
