import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("E-posta ve şifre gerekli");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Kullanıcı bulunamadı");
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
          // role bilgisini session callback'te ekleyeceğiz
        };
      },
    }),
  ],
  callbacks: {
  async session({ session, token }: { session: Session; token: JWT }) {
    if (session?.user) {
      // Token'daki bilgileri session'a aktar
      if (token.sub) {
        session.user.image = token.picture;
      }
      // User bilgilerini session'a ekle
      session.user.id = token.id;
      session.user.email = token.email;
      session.user.name = token.name;
    }
    return session;
  },
    async jwt({ token, user }: { token: JWT; user: any }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
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

// Export authOptions for use in other files
export const authOptions = authConfig;

export { handler as GET, handler as POST };