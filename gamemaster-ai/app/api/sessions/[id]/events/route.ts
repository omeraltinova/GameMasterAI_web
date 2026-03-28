import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getUserId, forbiddenResponse, unauthorizedResponse } from "@/lib/auth/server";
import { getCampaignActorRole, hasCampaignAccess } from "@/lib/auth/permissions";
import { rateLimitResponse } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();
const STREAM_OPEN_LIMIT = { windowMs: 60_000, max: 20 };
const MAX_CONCURRENT_STREAMS_PER_USER_SESSION = 3;
const streamCountByKey = new Map<string, number>();

function getStreamKey(userId: string, sessionId: string) {
  return `${userId}:${sessionId}`;
}

function acquireStreamSlot(streamKey: string) {
  const current = streamCountByKey.get(streamKey) ?? 0;
  const next = current + 1;
  streamCountByKey.set(streamKey, next);
  return next;
}

function releaseStreamSlot(streamKey: string) {
  const current = streamCountByKey.get(streamKey) ?? 0;
  if (current <= 1) {
    streamCountByKey.delete(streamKey);
    return;
  }
  streamCountByKey.set(streamKey, current - 1);
}

function serializeEvent(event: string, payload: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function parseSinceParam(value: string | null) {
  if (!value) {
    return new Date(Date.now() - 5_000);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() - 5_000);
  }
  return parsed;
}

function parseMessageMetadata(metadata: string | null) {
  if (!metadata) {
    return {
      metadata: undefined as Record<string, unknown> | undefined,
      gmPrompt: undefined as unknown,
      suggestions: undefined as unknown,
    };
  }

  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;
    return {
      metadata: parsed,
      gmPrompt: parsed.gmPrompt,
      suggestions: parsed.suggestions,
    };
  } catch {
    return {
      metadata: undefined,
      gmPrompt: undefined,
      suggestions: undefined,
    };
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId();
  if (!userId) {
    return unauthorizedResponse();
  }

  const { id: sessionId } = await params;
  const openLimited = rateLimitResponse(
    userId,
    "GET:/api/sessions/[id]/events",
    STREAM_OPEN_LIMIT,
    "Canlı güncelleme isteği limiti aşıldı. Lütfen biraz sonra tekrar deneyin.",
  );
  if (openLimited) {
    return openLimited;
  }

  const sinceParam = req.nextUrl.searchParams.get("since");
  let lastSeenAt = parseSinceParam(sinceParam);

  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      campaign: {
        select: {
          creatorId: true,
          players: {
            select: { userId: true },
          },
        },
      },
    },
  });

  if (!session) {
    return new Response(JSON.stringify({ success: false, error: "Session bulunamadı" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const actorRole = getCampaignActorRole(session.campaign, userId);
  if (!hasCampaignAccess(actorRole)) {
    return forbiddenResponse("Bu session'a erişim yetkiniz yok");
  }

  const streamKey = getStreamKey(userId, sessionId);
  const activeStreamCount = acquireStreamSlot(streamKey);
  if (activeStreamCount > MAX_CONCURRENT_STREAMS_PER_USER_SESSION) {
    releaseStreamSlot(streamKey);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Bu oturum için çok fazla eşzamanlı canlı bağlantı açıldı.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "15",
        },
      },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let isClosed = false;
      let heartbeatCounter = 0;
      let pollDelayMs = 2_500;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let slotReleased = false;

      const releaseSlot = () => {
        if (slotReleased) {
          return;
        }
        slotReleased = true;
        releaseStreamSlot(streamKey);
      };

      const scheduleNextTick = () => {
        if (isClosed) {
          return;
        }
        timeoutId = setTimeout(() => {
          void tick();
        }, pollDelayMs);
      };

      const sendInitialReady = () => {
        controller.enqueue(
          serializeEvent("ready", {
            success: true,
            sessionId,
            timestamp: new Date().toISOString(),
          }),
        );
      };

      const tick = async () => {
        if (isClosed) {
          return;
        }

        try {
          const [freshSession, newMessages] = await Promise.all([
            prisma.gameSession.findUnique({
              where: { id: sessionId },
              select: { updatedAt: true },
            }),
            prisma.message.findMany({
              where: {
                sessionId,
                isSoftDeleted: false,
                timestamp: { gt: lastSeenAt },
              },
              orderBy: { timestamp: "asc" },
              take: 50,
            }),
          ]);

          if (!freshSession) {
            controller.enqueue(
              serializeEvent("error", {
                success: false,
                error: "Session sonlandırıldı",
              }),
            );
            isClosed = true;
            releaseSlot();
            controller.close();
            return;
          }

          const sanitizedMessages = newMessages.map((message) => {
            const { metadata, gmPrompt, suggestions } = parseMessageMetadata(message.metadata);
            return {
              ...message,
              metadata,
              gmPrompt,
              suggestions,
              locationImageUrl: message.locationImageUrl,
              locationName: message.locationName,
            };
          });

          const hasNewMessages = sanitizedMessages.length > 0;
          const gameStateChanged = freshSession.updatedAt > lastSeenAt;
          const hasAnyUpdate = hasNewMessages || gameStateChanged;

          if (hasAnyUpdate) {
            const latestMessageAt =
              sanitizedMessages.length > 0
                ? new Date(sanitizedMessages[sanitizedMessages.length - 1].timestamp)
                : lastSeenAt;

            if (latestMessageAt > lastSeenAt) {
              lastSeenAt = latestMessageAt;
            } else if (freshSession.updatedAt > lastSeenAt) {
              lastSeenAt = freshSession.updatedAt;
            }

            controller.enqueue(
              serializeEvent("update", {
                success: true,
                updates: {
                  hasNewMessages,
                  messages: sanitizedMessages,
                  gameStateChanged,
                  lastUpdate: freshSession.updatedAt,
                },
                timestamp: new Date().toISOString(),
              }),
            );

            heartbeatCounter = 0;
            pollDelayMs = 2_500;
            return;
          }

          heartbeatCounter += 1;
          if (heartbeatCounter >= 6) {
            heartbeatCounter = 0;
            controller.enqueue(
              serializeEvent("heartbeat", {
                success: true,
                timestamp: new Date().toISOString(),
              }),
            );
          }
          pollDelayMs = Math.min(10_000, pollDelayMs + 750);
        } catch {
          controller.enqueue(
            serializeEvent("error", {
              success: false,
              error: "Gerçek zamanlı akışta hata oluştu",
            }),
          );
          pollDelayMs = Math.min(10_000, pollDelayMs + 1_000);
        } finally {
          scheduleNextTick();
        }
      };

      sendInitialReady();
      scheduleNextTick();

      req.signal.addEventListener("abort", () => {
        isClosed = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        releaseSlot();
        try {
          controller.close();
        } catch {
          // stream zaten kapanmış olabilir
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
