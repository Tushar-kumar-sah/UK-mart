import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "sah05tushar@gmail.com";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const isAdmin = user.email === ADMIN_EMAIL;
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        });
        if (!existingUser) {
          await db.user.create({
            data: {
              email: user.email!,
              name: user.name!,
              avatar: user.image,
              googleId: user.id,
              role: isAdmin ? "ADMIN" : "USER",
            },
          });
        } else {
          // If this is the admin email, ensure role is ADMIN
          await db.user.update({
            where: { email: user.email! },
            data: {
              name: user.name!,
              avatar: user.image,
              googleId: user.id,
              role: isAdmin ? "ADMIN" : existingUser.role,
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // ✅ Fetch the user from the database to get the latest role
        const dbUser = await db.user.findUnique({
          where: { email: session.user.email! },
        });
        if (dbUser) {
          (session.user as any).id = dbUser.id;
          (session.user as any).role = dbUser.role; // 👈 critical
        } else {
          (session.user as any).id = token.id;
          (session.user as any).role = token.role;
        }
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };