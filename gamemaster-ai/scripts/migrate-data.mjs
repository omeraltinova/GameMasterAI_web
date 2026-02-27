import { PrismaClient } from '@prisma/client';
import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';

const prisma = new PrismaClient();
const dbPath = path.resolve('prisma/dev.db');
const db = new sqlite3.Database(dbPath);
const all = promisify(db.all.bind(db));

const toDate = (val) => val ? new Date(val) : null;
const toBool = (val) => val === 1 || val === true || val === 'true';

async function migrate() {
  console.log("🚀 Veri temizleme ve taşıma işlemi başlıyor...");

  try {
    // 1. Kullanıcılar
    const users = await all('SELECT * FROM User');
    console.log(`--- ${users.length} Kullanıcı aktarılıyor...`);
    for (const u of users) {
      const { id, email, username, password, role, avatar, createdAt, updatedAt, profilePublic, showCharacters, showCampaigns, showScenarios, showStats } = u;
      await prisma.user.upsert({
        where: { id },
        update: {},
        create: {
          id, email, username, password, role, avatar,
          createdAt: toDate(createdAt),
          updatedAt: toDate(updatedAt),
          profilePublic: toBool(profilePublic),
          showCharacters: toBool(showCharacters),
          showCampaigns: toBool(showCampaigns),
          showScenarios: toBool(showScenarios),
          showStats: toBool(showStats)
        }
      });
    }

    // 2. Senaryolar
    const scenarios = await all('SELECT * FROM Scenario');
    console.log(`--- ${scenarios.length} Senaryo aktarılıyor...`);
    for (const s of scenarios) {
      const { id, title, description, genre, difficulty, startingPrompt, isOfficial, isFeatured, isAIGenerated, creatorId, tags, worldSettings, createdAt } = s;
      await prisma.scenario.upsert({
        where: { id },
        update: {},
        create: {
          id, title, description, genre, difficulty, startingPrompt, creatorId, tags, worldSettings,
          isOfficial: toBool(isOfficial),
          isFeatured: toBool(isFeatured),
          isAIGenerated: toBool(isAIGenerated),
          createdAt: toDate(createdAt)
        }
      });
    }

    // 3. Kampanyalar
    const campaigns = await all('SELECT * FROM Campaign');
    console.log(`--- ${campaigns.length} Kampanya aktarılıyor...`);
    for (const c of campaigns) {
      const { id, name, description, creatorId, scenarioId, isMultiplayer, maxPlayers, inviteCode, status, createdAt, updatedAt } = c;
      await prisma.campaign.upsert({
        where: { id },
        update: {},
        create: {
          id, name, description, creatorId, scenarioId, maxPlayers, inviteCode, status,
          isMultiplayer: toBool(isMultiplayer),
          createdAt: toDate(createdAt),
          updatedAt: toDate(updatedAt)
        }
      });
    }

    // 4. Karakterler
    const characters = await all('SELECT * FROM Character');
    console.log(`--- ${characters.length} Karakter aktarılıyor...`);
    for (const char of characters) {
      const { id, userId, campaignId, name, race, class: charClass, level, experience, hp, maxHp, stats, background, appearance, backstory, imageUrl, createdAt, updatedAt } = char;
      await prisma.character.upsert({
        where: { id },
        update: {},
        create: {
          id, userId, campaignId, name, race, class: charClass, level, experience, hp, maxHp, background, appearance, backstory, imageUrl,
          stats: stats || "{}", // String olarak saklanıyor (Prisma schema'da String)
          createdAt: toDate(createdAt),
          updatedAt: toDate(updatedAt)
        }
      });
    }

    // 5. Oturumlar
    const sessions = await all('SELECT * FROM GameSession');
    console.log(`--- ${sessions.length} Oturum aktarılıyor...`);
    for (const s of sessions) {
      const { id, campaignId, currentState, turnOrder, activePlayer, aiContext, createdAt, updatedAt } = s;
      await prisma.gameSession.upsert({
        where: { id },
        update: {},
        create: {
          id, campaignId, currentState, turnOrder, activePlayer, aiContext,
          createdAt: toDate(createdAt),
          updatedAt: toDate(updatedAt)
        }
      });
    }

    // 6. Mesajlar
    const messages = await all('SELECT * FROM Message');
    console.log(`--- ${messages.length} Mesaj aktarılıyor...`);
    for (const m of messages) {
      const { id, sessionId, senderId, senderType, senderName, content, metadata, locationImageUrl, locationName, timestamp } = m;
      await prisma.message.upsert({
        where: { id },
        update: {},
        create: {
          id, sessionId, senderId, senderType, senderName, content, metadata, locationImageUrl, locationName,
          timestamp: toDate(timestamp)
        }
      });
    }

    console.log('✅ TÜM VERİLER BAŞARIYLA TAŞINDI!');
  } catch (err) {
    console.error('❌ TAŞIMA SIRASINDA HATA:', err);
  } finally {
    await prisma.$disconnect();
    db.close();
  }
}

migrate();
