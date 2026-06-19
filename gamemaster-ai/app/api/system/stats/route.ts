import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getClientIp, rateLimitResponse, RATE_LIMIT_TIERS } from '@/lib/security/rateLimit';

/**
 * GET /api/system/stats
 * Herkese açık genel platform istatistikleri
 * Cache: 5 dakika
 */

let cachedStats: { data: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limited = await rateLimitResponse(ip, "GET:/api/system/stats", RATE_LIMIT_TIERS.READ);
    if (limited) return limited;

    // Cache kontrolü
    if (cachedStats && Date.now() - cachedStats.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, stats: cachedStats.data });
    }

    const [
      totalUsers,
      totalCampaigns,
      totalCharacters,
      totalMessages,
      totalScenarios,
      totalDiceRolls,
      totalSessions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.campaign.count(),
      prisma.character.count(),
      prisma.message.count(),
      prisma.scenario.count(),
      prisma.diceRoll.count(),
      prisma.gameSession.count(),
    ]);

    const stats = {
      totalUsers,
      totalCampaigns,
      totalCharacters,
      totalMessages,
      totalScenarios,
      totalDiceRolls,
      totalSessions,
    };

    // Cache'e kaydet
    cachedStats = { data: stats, timestamp: Date.now() };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('System stats error:', error);
    return NextResponse.json(
      { success: false, stats: null },
      { status: 500 }
    );
  }
}
