/**
 * GameMaster AI - Veritabanı Test Script
 * 
 * Çalıştırmak için:
 * npx tsx Database/test-db.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Veritabanı testi başlıyor...\n");

    try {
        // 1. USER OLUŞTUR
        console.log("📝 1. User oluşturuluyor...");
        const user = await prisma.user.create({
            data: {
                email: "test@gamemaster.ai",
                username: "TestAdventurer",
                password: "hashed_password_123",
                role: "MEMBER",
            },
        });
        console.log(`   ✅ User oluşturuldu: ${user.username}\n`);

        // 2. CHARACTER OLUŞTUR
        console.log("📝 2. Character oluşturuluyor...");
        const character = await prisma.character.create({
            data: {
                userId: user.id,
                name: "Thorin Testforge",
                race: "Dwarf",
                class: "Fighter",
                level: 5,
                hp: 45,
                maxHp: 52,
                stats: JSON.stringify({ str: 18, dex: 12, con: 16 }),
            },
        });
        console.log(`   ✅ Character oluşturuldu: ${character.name}\n`);

        // 3. CAMPAIGN OLUŞTUR
        console.log("📝 3. Campaign oluşturuluyor...");
        const campaign = await prisma.campaign.create({
            data: {
                name: "Test Campaign",
                creatorId: user.id,
                status: "ACTIVE",
            },
        });
        console.log(`   ✅ Campaign oluşturuldu: ${campaign.name}\n`);

        // 4. İLİŞKİLERİ KONTROL ET
        console.log("📝 4. İlişkiler test ediliyor...");
        const userWithRelations = await prisma.user.findUnique({
            where: { id: user.id },
            include: { characters: true, campaigns: true },
        });
        console.log(`   ✅ Characters: ${userWithRelations?.characters.length}`);
        console.log(`   ✅ Campaigns: ${userWithRelations?.campaigns.length}\n`);

        // 5. TEMİZLE (devre dışı - verileri görmek için)
        // console.log("🧹 5. Test verileri temizleniyor...");
        // await prisma.campaign.delete({ where: { id: campaign.id } });
        // await prisma.character.delete({ where: { id: character.id } });
        // await prisma.user.delete({ where: { id: user.id } });
        // console.log("   ✅ Temizlendi\n");
        console.log("ℹ️  Veriler veritabanında. Görmek için: npx prisma studio\n");

        console.log("═══════════════════════════════════════");
        console.log("✅ TÜM TESTLER BAŞARILI!");
        console.log("═══════════════════════════════════════\n");

    } catch (error) {
        console.error("❌ Hata:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
