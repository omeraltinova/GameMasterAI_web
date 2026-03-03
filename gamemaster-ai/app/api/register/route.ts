import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { registerSchema } from "@/lib/validators/auth";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Gecersiz veri girdiniz.", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { username, email, password } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const accountRateLimitKey = `register-account:${normalizedEmail}:${normalizedUsername}`;
    const accountRateLimit = checkRateLimit(accountRateLimitKey, { windowMs: 60 * 60 * 1000, max: 10 });
    if (!accountRateLimit.allowed) {
      return NextResponse.json({ success: false, error: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
    }

    // Optional second layer: only active when proxy IP headers are trusted via env.
    const ip = getClientIp(req);
    if (ip !== "unknown") {
      const ipRateLimit = checkRateLimit(`register-ip:${ip}`, { windowMs: 60 * 60 * 1000, max: 40 });
      if (!ipRateLimit.allowed) {
        return NextResponse.json({ success: false, error: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
      }
    }

    // Kullanıcı zaten var mı?
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: "Bu kullanıcı adı veya e-posta zaten kullanımda." }, { status: 409 });
    }

    // Şifreyi şifrele (Hash)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Veritabanına kaydet
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ success: true, message: "Kayıt başarılı!" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}
