import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ message: "Eksik bilgi girdiniz." }, { status: 400 });
    }

    // Kullanıcı zaten var mı?
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return NextResponse.json({ message: "Bu kullanıcı adı veya e-posta zaten kullanımda." }, { status: 409 });
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

    return NextResponse.json({ message: "Kayıt başarılı!" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Sunucu hatası oluştu." }, { status: 500 });
  }
}