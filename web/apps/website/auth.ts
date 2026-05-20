import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";
import { db, schema } from "./lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      discordId: string;
      discordUsername: string;
    } & DefaultSession["user"];
  }
  interface JWT {
    discordId?: string;
    discordUsername?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.id) return false;
      const discordId = String(profile.id);
      const username = (profile.username as string | undefined) ?? "unknown";
      const avatar = (profile.avatar as string | null | undefined) ?? null;
      const email = (profile.email as string | undefined) ?? null;

      await db
        .insert(schema.accounts)
        .values({
          discordId,
          discordUsername: username,
          discordAvatar: avatar,
          email,
          lastSeenAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.accounts.discordId,
          set: {
            discordUsername: username,
            discordAvatar: avatar,
            email,
            lastSeenAt: new Date(),
          },
        });
      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.id) {
        token.discordId = String(profile.id);
        token.discordUsername = (profile.username as string | undefined) ?? "unknown";
      }
      return token;
    },
    async session({ session, token }) {
      const discordId = token.discordId;
      const discordUsername = token.discordUsername;
      if (typeof discordId === "string") {
        session.user.discordId = discordId;
        session.user.discordUsername =
          typeof discordUsername === "string" ? discordUsername : "unknown";
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
