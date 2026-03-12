import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SYSTEM_SETTINGS_ID = "singleton";

async function generateUniqueInviteCode() {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const code = `SEED-${randomInt(1000, 9999)}`;
    const existing = await prisma.campaign.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  return `SEED-${Date.now().toString().slice(-4)}`;
}

function defaultStats(overrides?: Partial<Record<"strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma", number>>) {
  return {
    strength: 12,
    dexterity: 12,
    constitution: 12,
    intelligence: 12,
    wisdom: 12,
    charisma: 12,
    ...(overrides || {}),
  };
}

async function main() {
  const passwordHash = await bcrypt.hash("SeedPass123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin.seed@gamemaster.local" },
    update: {
      username: "seed_admin",
      password: passwordHash,
      role: "ADMIN",
      isSoftDeleted: false,
      isSuspended: false,
    },
    create: {
      email: "admin.seed@gamemaster.local",
      username: "seed_admin",
      password: passwordHash,
      role: "ADMIN",
      bio: "Seed admin account",
    },
  });

  const player = await prisma.user.upsert({
    where: { email: "player.seed@gamemaster.local" },
    update: {
      username: "seed_player",
      password: passwordHash,
      role: "MEMBER",
      isSoftDeleted: false,
      isSuspended: false,
    },
    create: {
      email: "player.seed@gamemaster.local",
      username: "seed_player",
      password: passwordHash,
      role: "MEMBER",
      bio: "Seed player account",
    },
  });

  await prisma.systemSetting.upsert({
    where: { id: SYSTEM_SETTINGS_ID },
    update: {},
    create: {
      id: SYSTEM_SETTINGS_ID,
      maintenanceMode: false,
      aiRequestsPerMinute: 60,
      updatedById: admin.id,
    },
  });

  let scenario = await prisma.scenario.findFirst({
    where: {
      title: "[Seed] Sisli Liman Sırrı",
      creatorId: admin.id,
      isSoftDeleted: false,
    },
  });

  if (!scenario) {
    scenario = await prisma.scenario.create({
      data: {
        title: "[Seed] Sisli Liman Sırrı",
        description: "Sisle kaplı bir limanda kaybolan gemilerin ardındaki sırrı çöz.",
        genre: "Fantasy",
        difficulty: "Medium",
        startingPrompt: "Liman meydanında fırtına çanları çalarken macera başlar.",
        isOfficial: false,
        isAIGenerated: false,
        creatorId: admin.id,
        tags: JSON.stringify(["seed", "liman", "mystery"]),
        worldSettings: JSON.stringify({
          worldName: "Eldoria",
          worldType: "High Fantasy",
          tone: "Dark Adventure",
          setting: "Foggy Port",
          startingLocation: {
            name: "Gri Rıhtım",
            description: "Sisli, eski ve söylentilerle dolu bir liman.",
          },
        }),
      },
    });
  }

  let campaign = await prisma.campaign.findFirst({
    where: {
      creatorId: admin.id,
      name: "[Seed] Sisli Liman Oturumu",
      isSoftDeleted: false,
    },
  });

  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        creatorId: admin.id,
        scenarioId: scenario.id,
        name: "[Seed] Sisli Liman Oturumu",
        description: "Seed amaçlı örnek çok oyunculu kampanya",
        isMultiplayer: true,
        maxPlayers: 4,
        status: "ACTIVE",
        inviteCode: await generateUniqueInviteCode(),
      },
    });
  }

  let adminCharacter = await prisma.character.findFirst({
    where: {
      userId: admin.id,
      name: "[Seed] Arin Stormblade",
    },
  });

  if (!adminCharacter) {
    adminCharacter = await prisma.character.create({
      data: {
        userId: admin.id,
        campaignId: campaign.id,
        name: "[Seed] Arin Stormblade",
        race: "Human",
        class: "Fighter",
        level: 4,
        experience: 900,
        hp: 34,
        maxHp: 34,
        gold: 250,
        stats: JSON.stringify(defaultStats({ strength: 16, constitution: 14 })),
        background: "Soldier",
        backstory: "Uzun yıllar sınır birliklerinde görev yaptı.",
      },
    });
  }

  let playerCharacter = await prisma.character.findFirst({
    where: {
      userId: player.id,
      name: "[Seed] Lyra Moonwhisper",
    },
  });

  if (!playerCharacter) {
    playerCharacter = await prisma.character.create({
      data: {
        userId: player.id,
        campaignId: campaign.id,
        name: "[Seed] Lyra Moonwhisper",
        race: "Elf",
        class: "Wizard",
        level: 3,
        experience: 650,
        hp: 20,
        maxHp: 20,
        gold: 120,
        stats: JSON.stringify(defaultStats({ intelligence: 17, dexterity: 14 })),
        background: "Sage",
        backstory: "Kayıp deniz büyülerini araştıran genç bir bilge.",
      },
    });
  }

  await prisma.campaignPlayer.upsert({
    where: {
      campaignId_userId: {
        campaignId: campaign.id,
        userId: admin.id,
      },
    },
    update: {
      isActive: true,
      characterId: adminCharacter.id,
    },
    create: {
      campaignId: campaign.id,
      userId: admin.id,
      characterId: adminCharacter.id,
      isActive: true,
    },
  });

  await prisma.campaignPlayer.upsert({
    where: {
      campaignId_userId: {
        campaignId: campaign.id,
        userId: player.id,
      },
    },
    update: {
      isActive: true,
      characterId: playerCharacter.id,
    },
    create: {
      campaignId: campaign.id,
      userId: player.id,
      characterId: playerCharacter.id,
      isActive: true,
    },
  });

  let session = await prisma.gameSession.findFirst({
    where: { campaignId: campaign.id },
  });

  if (!session) {
    session = await prisma.gameSession.create({
      data: {
        campaignId: campaign.id,
        currentState: JSON.stringify({
          location: "Gri Rıhtım",
          timeOfDay: "Akşam",
          weather: "Sisli",
          inCombat: false,
          activeNPCs: [],
          activeQuests: ["Kayıp Gemiyi Bul"],
          notes: "Seed başlangıç durumu",
        }),
      },
    });
  }

  const existingMessages = await prisma.message.count({ where: { sessionId: session.id } });
  if (existingMessages === 0) {
    await prisma.message.createMany({
      data: [
        {
          sessionId: session.id,
          senderType: "SYSTEM",
          senderName: "System",
          content: "[Seed] Oturum başlatıldı.",
        },
        {
          sessionId: session.id,
          senderType: "GM",
          senderName: "Game Master",
          content: "Sisli limana hoş geldiniz. Rıhtımda garip bir sessizlik hakim.",
        },
        {
          sessionId: session.id,
          senderType: "PLAYER",
          senderId: player.id,
          senderName: player.username,
          content: "Etrafta tanık olabilecek denizcileri arıyorum.",
        },
      ],
    });
  }

  const existingNpcs = await prisma.nPC.count({ where: { sessionId: session.id } });
  if (existingNpcs === 0) {
    await prisma.nPC.createMany({
      data: [
        {
          sessionId: session.id,
          name: "Kaptan Dorian",
          race: "Human",
          role: "Liman Muhafızı",
          personality: "Temkinli ama adaletli",
          isHostile: false,
          dialogue: JSON.stringify([{ text: "Fırtına öncesi liman her zaman sessizleşir." }]),
          stats: JSON.stringify({ hp: 18, ac: 12 }),
        },
        {
          sessionId: session.id,
          name: "Siyah Yel Korsanı",
          race: "Human",
          role: "Haydut",
          personality: "Agresif ve kışkırtıcı",
          isHostile: true,
          dialogue: JSON.stringify([{ text: "Bu liman artık bizim." }]),
          stats: JSON.stringify({ hp: 24, ac: 13 }),
        },
      ],
    });
  }

  const existingMap = await prisma.map.findFirst({
    where: {
      sessionId: session.id,
      name: "[Seed] Gri Rıhtım",
    },
  });

  if (!existingMap) {
    await prisma.map.create({
      data: {
        sessionId: session.id,
        name: "[Seed] Gri Rıhtım",
        description: "Limanın iskeleleri ve çevresindeki dar sokaklar",
        imageUrl: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=80",
        isAIGenerated: false,
      },
    });
  }

  const existingItems = await prisma.inventoryItem.count({ where: { characterId: playerCharacter.id } });
  if (existingItems === 0) {
    await prisma.inventoryItem.createMany({
      data: [
        {
          characterId: playerCharacter.id,
          name: "Kısa Asa",
          type: "Weapon",
          quantity: 1,
          equipped: true,
          weight: 2,
          properties: JSON.stringify({ damage: "1d6", damageType: "Bludgeoning" }),
        },
        {
          characterId: playerCharacter.id,
          name: "Gezgin Pelerini",
          type: "Cloak",
          quantity: 1,
          equipped: true,
          weight: 1,
          description: "Nem ve rüzgara karşı koruyucu.",
        },
        {
          characterId: playerCharacter.id,
          name: "Şifa İksiri",
          type: "Potion",
          quantity: 2,
          equipped: false,
          weight: 0.5,
          properties: JSON.stringify({ healing: "2d4+2" }),
        },
      ],
    });
  }

  console.log("Seed tamamlandı.");
  console.log("Admin:", admin.email, "| Player:", player.email);
  console.log("Campaign:", campaign.name, "| Invite:", campaign.inviteCode);
  console.log("Session:", session.id);
}

main()
  .catch((error) => {
    console.error("Seed hatası:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
