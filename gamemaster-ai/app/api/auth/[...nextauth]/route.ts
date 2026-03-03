import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";

type AuthTokenUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuspended?: boolean;
  isSoftDeleted?: boolean;
};

const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-posta ve şifre gerekli");
        }

        const ip = getClientIp(req);
        const rateLimitKey = `login:${ip}:${credentials.email.toLowerCase()}`;
        const rateLimit = checkRateLimit(rateLimitKey, { windowMs: 15 * 60 * 1000, max: 10 });
        if (!rateLimit.allowed) {
          throw new Error("Çok fazla deneme. Lütfen daha sonra tekrar deneyin.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Kullanıcı bulunamadı");
        }

        if (user.isSoftDeleted) {
          throw new Error("Hesabınız pasif durumda. Destek ekibiyle iletişime geçin.");
        }

        if (user.isSuspended) {
          const now = new Date();
          const suspensionStillActive = !user.suspendedUntil || user.suspendedUntil > now;

          if (suspensionStillActive) {
            const untilText = user.suspendedUntil
              ? ` Askı bitiş: ${user.suspendedUntil.toLocaleString("tr-TR")}`
              : "";
            throw new Error(`Hesabınız askıya alındı.${untilText}`);
          }

          // Süresi dolmuş askıyı otomatik kaldır
          await prisma.user.update({
            where: { id: user.id },
            data: {
              isSuspended: false,
              suspendedUntil: null,
              suspensionReason: null,
            },
          });
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Hatalı şifre");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
          isSuspended: false,
          isSoftDeleted: user.isSoftDeleted,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session?.user && token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.isSuspended = Boolean(token.isSuspended);
        session.user.isSoftDeleted = Boolean(token.isSoftDeleted);
      }
      return session;
    },
    async jwt({
      token,
      user,
      trigger,
      session,
    }: {
      token: JWT;
      user?: AuthTokenUser | null;
      trigger?: string;
      session?: Session;
    }) {
      // İlk giriş anı
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.isSuspended = Boolean(user.isSuspended);
        token.isSoftDeleted = Boolean(user.isSoftDeleted);
      }

      if (token.id) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            isSuspended: true,
            suspendedUntil: true,
            isSoftDeleted: true,
          },
        });

        if (!currentUser || currentUser.isSoftDeleted) {
          token.isSoftDeleted = true;
          token.isSuspended = false;
        } else {
          const now = new Date();
          const suspended = currentUser.isSuspended
            && (!currentUser.suspendedUntil || currentUser.suspendedUntil > now);

          token.email = currentUser.email;
          token.name = currentUser.username;
          token.role = currentUser.role;
          token.isSuspended = suspended;
          token.isSoftDeleted = currentUser.isSoftDeleted;
        }
      }

      // Kullanıcı update() fonksiyonunu çağırdığında burası çalışır
      if (trigger === "update" && session?.user) {
        // Gelen yeni ismi token'a yaz
        if (session.user.name) {
          token.name = session.user.name;
        }
      }

      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authConfig);

export const authOptions = authConfig;

export { handler as GET, handler as POST };
