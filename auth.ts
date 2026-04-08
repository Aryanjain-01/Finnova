import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Thrown when PostgreSQL is unreachable so Auth.js does not wrap Prisma as CallbackRouteError. */
class DatabaseUnavailableError extends CredentialsSignin {
  code = "database_unavailable";
}

function isDatabaseConnectionError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    return e.code === "P1001" || e.code === "P1000";
  }
  return false;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        try {
          const user = await prisma.user.findUnique({
            where: { email: parsed.data.email },
          });
          if (!user) return null;
          const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
          if (!ok) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
          };
        } catch (e) {
          if (isDatabaseConnectionError(e)) {
            console.warn(
              "[auth] Database unreachable — start PostgreSQL or fix DATABASE_URL."
            );
            throw new DatabaseUnavailableError();
          }
          throw e;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: { signIn: "/login" },
  trustHost: true,
});
