/**
 * Seed Script - Test verisi oluşturma
 * 
 * Bu script, AI entegrasyonunu test etmek için örnek veriler oluşturur.
 * 
 * Kullanım:
 * npx tsx scripts/seed-test-data.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed data oluşturuluyor...\n');

  // 1. Test kullanıcı oluştur
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      username: 'TestPlayer',
      password: hashedPassword,
      role: 'MEMBER',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestPlayer',
    },
  });
  console.log('✅ Kullanıcı oluşturuldu:', user.username);

  // 2. Test senaryo oluştur
  const scenario = await prisma.scenario.upsert({
    where: { id: 'scenario_test_1' },
    update: {},
    create: {
      id: 'scenario_test_1',
      title: 'Kayıp Tapınak',
      description: 'Eski bir tapınağın kalıntılarında gizemli olaylar yaşanıyor. Yerliler tapınağa girenlerin geri dönmediğini söylüyor.',
      genre: 'Fantasy',
      difficulty: 'Medium',
      startingPrompt: 'Eski bir tapınağın kalıntıları önündesiniz. Yosun kaplı taş sütunlar gökyüzüne uzanıyor ve giriş kapısında gizemli semboller var. İçeriden hafif bir ışık sızıyor, ama aynı zamanda garip sesler de duyuluyor. Ne yapacaksınız?',
      isOfficial: true,
      isAIGenerated: false,
      creatorId: user.id,
      tags: JSON.stringify(['dungeon', 'mystery', 'adventure']),
    },
  });
  console.log('✅ Senaryo oluşturuldu:', scenario.title);

  // 3. Test karakter oluştur
  const character = await prisma.character.upsert({
    where: { id: 'char_test_1' },
    update: {},
    create: {
      id: 'char_test_1',
      userId: user.id,
      name: 'Thorin Kalkan',
      race: 'Dwarf',
      class: 'Fighter',
      level: 3,
      experience: 900,
      hp: 27,
      maxHp: 27,
      stats: JSON.stringify({
        strength: 16,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 13,
        charisma: 8,
      }),
      background: 'Eski bir asker olan Thorin, şimdi maceraperest bir hayat sürüyor.',
      imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Thorin',
    },
  });
  console.log('✅ Karakter oluşturuldu:', character.name);

  // 4. Test oturum oluştur
  const campaign = await prisma.campaign.upsert({
    where: { id: 'campaign_test_1' },
    update: {},
    create: {
      id: 'campaign_test_1',
      name: 'Thorin\'in Macerası',
      description: 'Kayıp Tapınak senaryosu ile tek oyunculu macera',
      creatorId: user.id,
      scenarioId: scenario.id,
      isMultiplayer: false,
      maxPlayers: 1,
      inviteCode: 'TEST123',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Oturum oluşturuldu:', campaign.name);

  // 5. Oturum-oyuncu ilişkisi oluştur
  const campaignPlayer = await prisma.campaignPlayer.upsert({
    where: { 
      campaignId_userId: {
        campaignId: campaign.id,
        userId: user.id,
      }
    },
    update: {},
    create: {
      campaignId: campaign.id,
      userId: user.id,
      characterId: character.id,
      isActive: true,
    },
  });
  console.log('✅ Oturum-oyuncu ilişkisi oluşturuldu');

  // 6. Karakteri oturuma atayalım
  const updatedCharacter = await prisma.character.update({
    where: { id: character.id },
    data: { campaignId: campaign.id },
  });
  console.log('✅ Karakter oturuma atandı');

  // 7. Test envanter öğeleri oluştur
  const items = [
    {
      name: 'Battleaxe',
      type: 'Weapon',
      description: 'Güçlü bir savaş baltası',
      quantity: 1,
      properties: JSON.stringify({ damage: '1d8+3', damageType: 'slashing' }),
      equipped: true,
      weight: 3.5,
    },
    {
      name: 'Chain Mail',
      type: 'Armor',
      description: 'Zincir zırh',
      quantity: 1,
      properties: JSON.stringify({ armorClass: 16 }),
      equipped: true,
      weight: 20.0,
    },
    {
      name: 'Healing Potion',
      type: 'Potion',
      description: 'Sağlık iksiri',
      quantity: 2,
      properties: JSON.stringify({ healing: '2d4+2' }),
      equipped: false,
      weight: 0.5,
    },
    {
      name: 'Shield',
      type: 'Armor',
      description: 'Ahşap kalkan',
      quantity: 1,
      properties: JSON.stringify({ armorClass: 2 }),
      equipped: true,
      weight: 6.0,
    },
  ];

  for (const item of items) {
    await prisma.inventoryItem.create({
      data: {
        characterId: character.id,
        ...item,
      },
    });
  }
  console.log('✅ Envanter öğeleri oluşturuldu:', items.length);

  // 8. Test oyun oturumu oluştur
  const session = await prisma.gameSession.upsert({
    where: { id: 'session_test_1' },
    update: {},
    create: {
      id: 'session_test_1',
      campaignId: campaign.id,
      currentState: JSON.stringify({
        location: 'Kayıp Tapınak - Giriş',
        timeOfDay: 'sabah',
        weather: 'açık',
        activeNPCs: [],
        activeQuests: ['Tapınağın gizemini keşfet'],
        notes: 'Oyun başladı',
      }),
      turnOrder: JSON.stringify([character.id]),
      activePlayer: character.id,
      aiContext: 'Oyun yeni başladı. Oyuncu Thorin, Kayıp Tapınak\'ın girişinde.',
    },
  });
  console.log('✅ Oyun oturumu oluşturuldu:', session.id);

  // 9. Hoş geldin mesajı oluştur
  const welcomeMessage = await prisma.message.create({
    data: {
      sessionId: session.id,
      senderType: 'GM',
      senderName: 'Game Master',
      content: scenario.startingPrompt,
      timestamp: new Date(),
    },
  });
  console.log('✅ Hoş geldin mesajı oluşturuldu');

  // 10. Test NPC oluştur
  const npc = await prisma.nPC.create({
    data: {
      sessionId: session.id,
      name: 'Yaşlı Muhafız',
      race: 'Human',
      role: 'Guard',
      personality: 'Şüpheci, ama yardımsever. Tapınağın tehlikelerini bilir.',
      stats: JSON.stringify({
        strength: 14,
        dexterity: 10,
        constitution: 12,
        intelligence: 10,
        wisdom: 14,
        charisma: 8,
      }),
      isHostile: false,
      dialogue: JSON.stringify([]),
      imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guard',
    },
  });
  console.log('✅ NPC oluşturuldu:', npc.name);

  console.log('\n🎉 Seed data başarıyla oluşturuldu!\n');
  console.log('📝 Test bilgileri:');
  console.log('   Email: test@example.com');
  console.log('   Password: password123');
  console.log('   Oturum ID:', campaign.id);
  console.log('   Session ID:', session.id);
  console.log('   Karakter ID:', character.id);
  console.log('\n🔗 Test URL: http://localhost:3000/campaigns/' + campaign.id + '/play');
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
