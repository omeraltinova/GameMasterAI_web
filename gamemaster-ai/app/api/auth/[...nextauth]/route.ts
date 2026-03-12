import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
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
  passwordSignature?: string;
};

const DUMMY_BCRYPT_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const LOGIN_GLOBAL_LIMIT = { windowMs: 60 * 1000, max: 180 };
const LOGIN_IP_LIMIT = { windowMs: 15 * 60 * 1000, max: 40 };
const LOGIN_ACCOUNT_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 };
const LOGIN_ACCOUNT_BACKOFF_LIMIT = { windowMs: 2 * 60 * 1000, max: 5 };

function buildPasswordSignature(passwordHash: string) {
  const secret = process.env.NEXTAUTH_SECRET || "local-dev-secret";
  return createHash("sha256")
    .update(`${passwordHash}:${secret}`)
    .digest("hex");
}

function revokeToken(token: JWT) {
  token.id = "";
  token.email = "";
  token.name = "";
  token.role = "VISITOR";
  token.isSuspended = false;
  token.isSoftDeleted = true;
  token.passwordSignature = "";
  token.sessionRevoked = true;
  return token;
}

function buildThrottleMessage(prefix: string, resetAt: number) {
  const retryAfterSec = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return `${prefix} ${retryAfterSec} saniye sonra tekrar deneyin.`;
}

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
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();
        const ip = getClientIp(req);
        const ipRateLimitKey = ip !== "unknown" ? ip : "unknown";

        const globalRateLimit = checkRateLimit("login-global", LOGIN_GLOBAL_LIMIT);
        if (!globalRateLimit.allowed) {
          throw new Error(buildThrottleMessage("Giriş denemeleri geçici olarak sınırlandı.", globalRateLimit.resetAt));
        }

        const ipRateLimit = checkRateLimit(`login-ip:${ipRateLimitKey}`, LOGIN_IP_LIMIT);
        if (!ipRateLimit.allowed) {
          throw new Error(buildThrottleMessage("IP bazlı giriş limiti aşıldı.", ipRateLimit.resetAt));
        }

        const accountRateLimit = checkRateLimit(`login-account:${normalizedEmail}`, LOGIN_ACCOUNT_LIMIT);
        if (!accountRateLimit.allowed) {
          throw new Error(buildThrottleMessage("Hesap bazlı giriş limiti aşıldı.", accountRateLimit.resetAt));
        }

        // Progressive backoff for rapid repeated attempts on the same account.
        const accountBackoffRateLimit = checkRateLimit(
          `login-account-backoff:${normalizedEmail}`,
          LOGIN_ACCOUNT_BACKOFF_LIMIT,
        );
        if (!accountBackoffRateLimit.allowed) {
          throw new Error(buildThrottleMessage("Çok sık giriş denemesi algılandı.", accountBackoffRateLimit.resetAt));
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        // Run password verify for both existent and non-existent users to reduce timing differences.
        const passwordHashForCheck = user?.password ?? DUMMY_BCRYPT_HASH;
        const isPasswordValid = await bcrypt.compare(credentials.password, passwordHashForCheck);

        if (!user || !isPasswordValid || user.isSoftDeleted) {
          return null;
        }

        if (user.isSuspended) {
          const now = new Date();
          const suspensionStillActive = !user.suspendedUntil || user.suspendedUntil > now;

          if (suspensionStillActive) {
            return null;
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

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
          isSuspended: false,
          isSoftDeleted: user.isSoftDeleted,
          passwordSignature: buildPasswordSignature(user.password),
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
        token.passwordSignature = user.passwordSignature || "";
        token.sessionRevoked = false;
      }

      if (token.id) {
        const currentUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            password: true,
            isSuspended: true,
            suspendedUntil: true,
            isSoftDeleted: true,
          },
        });

        if (!currentUser || currentUser.isSoftDeleted) {
          return revokeToken(token);
        } else {
          const currentPasswordSignature = buildPasswordSignature(currentUser.password);
          if (token.passwordSignature && token.passwordSignature !== currentPasswordSignature) {
            return revokeToken(token);
          }
          if (!token.passwordSignature) {
            return revokeToken(token);
          }

          const now = new Date();
          const suspended = currentUser.isSuspended
            && (!currentUser.suspendedUntil || currentUser.suspendedUntil > now);

          token.email = currentUser.email;
          token.name = currentUser.username;
          token.role = suspended ? "VISITOR" : currentUser.role;
          token.isSuspended = suspended;
          token.isSoftDeleted = currentUser.isSoftDeleted;
          token.sessionRevoked = false;
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
