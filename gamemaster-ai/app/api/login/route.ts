import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Bilgiler eksik.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) throw new Error("Kullanıcı bulunamadı.");

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) throw new Error("Şifre hatalı.");

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          // Role bilgisini burada döndürebiliriz ama type hatası almamak için şimdilik temel bilgiler yeterli
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" }, // Kendi login sayfamızı kullanacağımızı belirtiyoruz
  secret: process.env.NEXTAUTH_SECRET, // .env dosyasına eklemeyi unutma
});

export { handler as GET, handler as POST };