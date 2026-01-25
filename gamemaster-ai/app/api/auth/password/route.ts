import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { getUserId } from "@/lib/auth/server";
import { passwordChangeSchema } from "@/lib/validators/auth";

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ message: "Oturum acmaniz gerekiyor" }, { status: 401 });
    }

    const payload = await req.json();
    const parsed = passwordChangeSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Gecersiz veri girdiniz.", errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { message: "Yeni sifre mevcut sifreyle ayni olamaz." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ message: "Kullanici bulunamadi" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ message: "Mevcut sifre hatali" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: "Sifre guncellendi" });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ message: "Sunucu hatasi olustu." }, { status: 500 });
  }
}
