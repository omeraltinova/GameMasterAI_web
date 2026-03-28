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

// SQLite tablosunun var olup olmadığını kontrol et
async function tableExists(tableName) {
  const result = await all(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [tableName]
  );
  return result.length > 0;
}

// Güvenli şekilde tablo verilerini oku
async function safeReadTable(tableName) {
  if (await tableExists(tableName)) {
    return await all(`SELECT * FROM "${tableName}"`);
  }
  console.log(`   ⚠️  "${tableName}" tablosu SQLite'da bulunamadı, atlanıyor.`);
  return [];
}

async function migrate() {
  console.log("🚀 SQLite → PostgreSQL veri taşıma işlemi başlıyor...\n");

  try {
    // 1. Kullanıcılar
    const users = await safeReadTable('User');
    console.log(`1. ${users.length} Kullanıcı aktarılıyor...`);
    for (const u of users) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          email: u.email,
          username: u.username,
          password: u.password,
          role: u.role || 'MEMBER',
          avatar: u.avatar,
          bio: u.bio || null,
          isSuspended: toBool(u.isSuspended),
          suspendedUntil: toDate(u.suspendedUntil),
          suspensionReason: u.suspensionReason || null,
          adminNote: u.adminNote || null,
          isSoftDeleted: toBool(u.isSoftDeleted),
          softDeletedAt: toDate(u.softDeletedAt),
          softDeleteReason: u.softDeleteReason || null,
          aiDailyTokenLimit: u.aiDailyTokenLimit ?? 120000,
          aiTokensUsedToday: u.aiTokensUsedToday ?? 0,
          aiUsageResetAt: toDate(u.aiUsageResetAt) || new Date(),
          profilePublic: toBool(u.profilePublic ?? true),
          showCharacters: toBool(u.showCharacters ?? true),
          showCampaigns: toBool(u.showCampaigns ?? true),
          showScenarios: toBool(u.showScenarios ?? true),
          showStats: toBool(u.showStats ?? true),
          createdAt: toDate(u.createdAt),
          updatedAt: toDate(u.updatedAt),
        }
      });
    }

    // 2. Senaryolar
    const scenarios = await safeReadTable('Scenario');
    console.log(`2. ${scenarios.length} Senaryo aktarılıyor...`);
    for (const s of scenarios) {
      await prisma.scenario.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          title: s.title,
          description: s.description,
          genre: s.genre,
          difficulty: s.difficulty || 'Medium',
          startingPrompt: s.startingPrompt,
          isOfficial: toBool(s.isOfficial),
          isFeatured: toBool(s.isFeatured),
          isAIGenerated: toBool(s.isAIGenerated),
          creatorId: s.creatorId || null,
          tags: s.tags || null,
          worldSettings: s.worldSettings || null,
          isSoftDeleted: toBool(s.isSoftDeleted),
          softDeletedAt: toDate(s.softDeletedAt),
          createdAt: toDate(s.createdAt),
        }
      });
    }

    // 3. Senaryo Koleksiyonları
    const collections = await safeReadTable('ScenarioCollection');
    console.log(`3. ${collections.length} Senaryo Koleksiyonu aktarılıyor...`);
    for (const c of collections) {
      await prisma.scenarioCollection.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          name: c.name,
          description: c.description || null,
          createdAt: toDate(c.createdAt),
          updatedAt: toDate(c.updatedAt),
        }
      });
    }

    // 4. Senaryo Koleksiyon Öğeleri
    const collectionItems = await safeReadTable('ScenarioCollectionItem');
    console.log(`4. ${collectionItems.length} Koleksiyon Öğesi aktarılıyor...`);
    for (const ci of collectionItems) {
      await prisma.scenarioCollectionItem.upsert({
        where: { id: ci.id },
        update: {},
        create: {
          id: ci.id,
          collectionId: ci.collectionId,
          scenarioId: ci.scenarioId,
          position: ci.position ?? 0,
          addedAt: toDate(ci.addedAt),
        }
      });
    }

    // 5. Kampanyalar
    const campaigns = await safeReadTable('Campaign');
    console.log(`5. ${campaigns.length} Kampanya aktarılıyor...`);
    for (const c of campaigns) {
      await prisma.campaign.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          name: c.name,
          description: c.description || null,
          creatorId: c.creatorId,
          scenarioId: c.scenarioId || null,
          isMultiplayer: toBool(c.isMultiplayer),
          maxPlayers: c.maxPlayers ?? 4,
          inviteCode: c.inviteCode || null,
          status: c.status || 'DRAFT',
          isSoftDeleted: toBool(c.isSoftDeleted),
          softDeletedAt: toDate(c.softDeletedAt),
          createdAt: toDate(c.createdAt),
          updatedAt: toDate(c.updatedAt),
        }
      });
    }

    // 6. Karakterler
    const characters = await safeReadTable('Character');
    console.log(`6. ${characters.length} Karakter aktarılıyor...`);
    for (const ch of characters) {
      await prisma.character.upsert({
        where: { id: ch.id },
        update: {},
        create: {
          id: ch.id,
          userId: ch.userId,
          campaignId: ch.campaignId || null,
          name: ch.name,
          race: ch.race,
          class: ch.class,
          level: ch.level ?? 1,
          experience: ch.experience ?? 0,
          hp: ch.hp,
          maxHp: ch.maxHp,
          gold: ch.gold ?? 0,
          stats: ch.stats || '{}',
          background: ch.background || null,
          appearance: ch.appearance || null,
          backstory: ch.backstory || null,
          imageUrl: ch.imageUrl || null,
          createdAt: toDate(ch.createdAt),
          updatedAt: toDate(ch.updatedAt),
        }
      });
    }

    // 7. Oyun Oturumları
    const sessions = await safeReadTable('GameSession');
    console.log(`7. ${sessions.length} Oyun Oturumu aktarılıyor...`);
    for (const s of sessions) {
      await prisma.gameSession.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          campaignId: s.campaignId,
          currentState: s.currentState || '{}',
          turnOrder: s.turnOrder || null,
          activePlayer: s.activePlayer || null,
          aiContext: s.aiContext || null,
          createdAt: toDate(s.createdAt),
          updatedAt: toDate(s.updatedAt),
        }
      });
    }

    // 8. Mesajlar
    const messages = await safeReadTable('Message');
    console.log(`8. ${messages.length} Mesaj aktarılıyor...`);
    for (const m of messages) {
      await prisma.message.upsert({
        where: { id: m.id },
        update: {},
        create: {
          id: m.id,
          sessionId: m.sessionId,
          senderId: m.senderId || null,
          senderType: m.senderType,
          senderName: m.senderName || null,
          content: m.content,
          metadata: m.metadata || null,
          locationImageUrl: m.locationImageUrl || null,
          locationName: m.locationName || null,
          isSoftDeleted: toBool(m.isSoftDeleted),
          softDeletedAt: toDate(m.softDeletedAt),
          timestamp: toDate(m.timestamp),
        }
      });
    }

    // 9. Zar Atımları
    const diceRolls = await safeReadTable('DiceRoll');
    console.log(`9. ${diceRolls.length} Zar Atımı aktarılıyor...`);
    for (const d of diceRolls) {
      await prisma.diceRoll.upsert({
        where: { id: d.id },
        update: {},
        create: {
          id: d.id,
          sessionId: d.sessionId,
          characterId: d.characterId || null,
          diceType: d.diceType,
          count: d.count ?? 1,
          results: d.results,
          modifier: d.modifier ?? 0,
          total: d.total,
          purpose: d.purpose || null,
          timestamp: toDate(d.timestamp),
        }
      });
    }

    // 10. NPC'ler
    const npcs = await safeReadTable('NPC');
    console.log(`10. ${npcs.length} NPC aktarılıyor...`);
    for (const n of npcs) {
      await prisma.nPC.upsert({
        where: { id: n.id },
        update: {},
        create: {
          id: n.id,
          sessionId: n.sessionId,
          name: n.name,
          race: n.race || null,
          role: n.role,
          personality: n.personality || null,
          stats: n.stats || null,
          isHostile: toBool(n.isHostile),
          dialogue: n.dialogue || null,
          imageUrl: n.imageUrl || null,
          createdAt: toDate(n.createdAt),
        }
      });
    }

    // 11. Savaşlar
    const combats = await safeReadTable('Combat');
    console.log(`11. ${combats.length} Savaş aktarılıyor...`);
    for (const c of combats) {
      await prisma.combat.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          sessionId: c.sessionId,
          participants: c.participants,
          turnOrder: c.turnOrder,
          currentTurn: c.currentTurn ?? 0,
          round: c.round ?? 1,
          status: c.status || 'active',
          log: c.log || null,
          createdAt: toDate(c.createdAt),
        }
      });
    }

    // 12. Envanter Öğeleri
    const items = await safeReadTable('InventoryItem');
    console.log(`12. ${items.length} Envanter Öğesi aktarılıyor...`);
    for (const i of items) {
      await prisma.inventoryItem.upsert({
        where: { id: i.id },
        update: {},
        create: {
          id: i.id,
          characterId: i.characterId,
          name: i.name,
          type: i.type,
          description: i.description || null,
          quantity: i.quantity ?? 1,
          properties: i.properties || null,
          equipped: toBool(i.equipped),
          weight: i.weight ?? 0,
        }
      });
    }

    // 13. Haritalar
    const maps = await safeReadTable('Map');
    console.log(`13. ${maps.length} Harita aktarılıyor...`);
    for (const m of maps) {
      await prisma.map.upsert({
        where: { id: m.id },
        update: {},
        create: {
          id: m.id,
          sessionId: m.sessionId,
          name: m.name || null,
          description: m.description || null,
          imageUrl: m.imageUrl,
          isAIGenerated: toBool(m.isAIGenerated),
          prompt: m.prompt || null,
          createdAt: toDate(m.createdAt),
        }
      });
    }

    // 14. Kampanya Oyuncuları
    const players = await safeReadTable('CampaignPlayer');
    console.log(`14. ${players.length} Kampanya Oyuncusu aktarılıyor...`);
    for (const p of players) {
      await prisma.campaignPlayer.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          campaignId: p.campaignId,
          userId: p.userId,
          characterId: p.characterId,
          joinedAt: toDate(p.joinedAt),
          isActive: toBool(p.isActive ?? true),
        }
      });
    }

    // 15. Moderasyon Raporları
    const reports = await safeReadTable('ModerationReport');
    console.log(`15. ${reports.length} Moderasyon Raporu aktarılıyor...`);
    for (const r of reports) {
      await prisma.moderationReport.upsert({
        where: { id: r.id },
        update: {},
        create: {
          id: r.id,
          reporterId: r.reporterId,
          entityType: r.entityType,
          entityId: r.entityId,
          reason: r.reason,
          details: r.details || null,
          status: r.status || 'PENDING',
          reviewedById: r.reviewedById || null,
          reviewedAt: toDate(r.reviewedAt),
          resolutionNote: r.resolutionNote || null,
          createdAt: toDate(r.createdAt),
          updatedAt: toDate(r.updatedAt),
        }
      });
    }

    // 16. Sistem Ayarları
    const settings = await safeReadTable('SystemSetting');
    console.log(`16. ${settings.length} Sistem Ayarı aktarılıyor...`);
    for (const s of settings) {
      await prisma.systemSetting.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          maintenanceMode: toBool(s.maintenanceMode),
          maintenanceMessage: s.maintenanceMessage || null,
          aiPrimaryModel: s.aiPrimaryModel || null,
          aiFallbackModel: s.aiFallbackModel || null,
          aiSuggestionsModel: s.aiSuggestionsModel || null,
          aiRequestsPerMinute: s.aiRequestsPerMinute || null,
          updatedById: s.updatedById || null,
        }
      });
    }

    // 17. Admin İşlem Kayıtları
    const logs = await safeReadTable('AdminActionLog');
    console.log(`17. ${logs.length} Admin İşlem Kaydı aktarılıyor...`);
    for (const l of logs) {
      await prisma.adminActionLog.upsert({
        where: { id: l.id },
        update: {},
        create: {
          id: l.id,
          adminId: l.adminId,
          action: l.action,
          entityType: l.entityType || null,
          entityId: l.entityId || null,
          metadata: l.metadata || null,
          createdAt: toDate(l.createdAt),
        }
      });
    }

    // 18. Kullanıcı Başarımları
    const achievements = await safeReadTable('UserAchievement');
    console.log(`18. ${achievements.length} Kullanıcı Başarımı aktarılıyor...`);
    for (const a of achievements) {
      await prisma.userAchievement.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id,
          userId: a.userId,
          achievementId: a.achievementId,
          unlockedAt: toDate(a.unlockedAt),
        }
      });
    }

    console.log('\n✅ TÜM VERİLER BAŞARIYLA TAŞINDI!');
  } catch (err) {
    console.error('\n❌ TAŞIMA SIRASINDA HATA:', err);
  } finally {
    await prisma.$disconnect();
    db.close();
  }
}

migrate();
