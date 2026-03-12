import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";
import { registerSchema } from "@/lib/validators/auth";

const REGISTER_GENERIC_SUCCESS_MESSAGE = "Kayıt işlemi alındı. Hesabınız hazırsa giriş yapabilirsiniz.";

function getIpSubnetKey(ip: string) {
  const normalizedIp = ip.trim().toLowerCase();
  if (!normalizedIp) {
    return null;
  }

  const ipv4Parts = normalizedIp.split(".");
  if (ipv4Parts.length === 4 && ipv4Parts.every((part) => /^\d+$/.test(part))) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.${ipv4Parts[2]}.0/24`;
  }

  if (normalizedIp.includes(":")) {
    const ipv6Segments = normalizedIp.split(":").filter(Boolean);
    if (ipv6Segments.length > 0) {
      return `${ipv6Segments.slice(0, 4).join(":")}::/64`;
    }
  }

  return null;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

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

    const usernameRateLimit = checkRateLimit(`register-username:${normalizedUsername}`, { windowMs: 60 * 60 * 1000, max: 10 });
    if (!usernameRateLimit.allowed) {
      return NextResponse.json({ success: false, error: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
    }

    const emailRateLimit = checkRateLimit(`register-email:${normalizedEmail}`, { windowMs: 60 * 60 * 1000, max: 10 });
    if (!emailRateLimit.allowed) {
      return NextResponse.json({ success: false, error: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
    }

    const ip = getClientIp(req);
    if (ip !== "unknown") {
      const ipRateLimit = checkRateLimit(`register-ip:${ip}`, { windowMs: 60 * 60 * 1000, max: 40 });
      if (!ipRateLimit.allowed) {
        return NextResponse.json({ success: false, error: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
      }

      const subnet = getIpSubnetKey(ip);
      if (subnet) {
        const subnetRateLimit = checkRateLimit(`register-subnet:${subnet}`, { windowMs: 60 * 60 * 1000, max: 120 });
        if (!subnetRateLimit.allowed) {
          return NextResponse.json({ success: false, error: "Çok fazla deneme. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
        }
      }
    }

    // Kasıtlı olarak duplicate akışında da benzer maliyet üretmek için hash burada üretilir.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcı zaten var mı?
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: normalizedUsername }]
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ success: true, message: REGISTER_GENERIC_SUCCESS_MESSAGE }, { status: 201 });
    }

    // Veritabanına kaydet
    await prisma.user.create({
      data: {
        username: username.trim(),
        email: normalizedEmail,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ success: true, message: REGISTER_GENERIC_SUCCESS_MESSAGE }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ success: true, message: REGISTER_GENERIC_SUCCESS_MESSAGE }, { status: 201 });
    }
    return NextResponse.json({ success: false, error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}
