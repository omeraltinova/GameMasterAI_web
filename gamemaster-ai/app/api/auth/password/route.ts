import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { getUserId } from "@/lib/auth/server";
import { passwordChangeSchema } from "@/lib/validators/auth";
import { rateLimitResponse, RATE_LIMIT_TIERS } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Oturum acmaniz gerekiyor" }, { status: 401 });
    }

    const limited = rateLimitResponse(userId, "POST:/api/auth/password", RATE_LIMIT_TIERS.AUTH_SENSITIVE);
    if (limited) return limited;

    const payload = await req.json();
    const parsed = passwordChangeSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Gecersiz veri girdiniz.", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, error: "Yeni sifre mevcut sifreyle ayni olamaz." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Kullanici bulunamadi" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ success: false, error: "Mevcut sifre hatali" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: "Sifre guncellendi" });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ success: false, error: "Sunucu hatasi olustu." }, { status: 500 });
  }
}
