import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        idNumber: { label: "ID Number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds) return null;
        const { idNumber, password } = creds;

        if (idNumber === "insignadmin") {
          const ok = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH!);
          if (!ok) return null;
          return { id: "admin", name: "Admin", role: "admin" } as any;
        }

        const user = await prisma.user.findUnique({ where: { idNumber } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.fullName, role: user.role } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = (token as any).role;
      }
      return session;
    },
  },
};