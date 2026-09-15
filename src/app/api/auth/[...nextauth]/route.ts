import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { normalizePhone, verifyPassword } from "@/lib/auth-utils";

// ============================================================
// 🚀 Force dynamic runtime – NEVER static
// ============================================================
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function generateStaticParams() {
  return [];
}

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "martuk877@gmail.com").trim().toLowerCase();

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: "phone-login",
      name: "Phone Number",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) {
          throw new Error("Phone and password are required");
        }

        const cleanPhone = normalizePhone(credentials.phone);
        if (!cleanPhone || cleanPhone.length < 10) {
          throw new Error("Enter a valid 10-digit phone number");
        }

        const user = await db.user.findUnique({
          where: { phone: cleanPhone },
        });

        if (!user || !user.password) {
          throw new Error("No account found with this phone number. Please sign up.");
        }

        if (!user.isActive) {
          throw new Error("This account is inactive. Please contact support.");
        }

        const isValid = verifyPassword(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Incorrect password. Please try again.");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email || `${user.phone}@phone.ukmart.co.in`,
          phone: user.phone,
          image: user.avatar,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const email = user.email?.trim().toLowerCase();
          if (!email) {
            console.error("Google sign-in error: missing email");
            return false;
          }

          const isAdmin = email === ADMIN_EMAIL;
          const googleId = account.providerAccountId || user.id;
          const displayName = user.name?.trim() || email.split("@")[0] || "Customer";

          const existingUser = await db.user.findFirst({
            where: {
              OR: [{ email }, ...(googleId ? [{ googleId }] : [])],
            },
          });

          if (!existingUser) {
            await db.user.create({
              data: {
                email,
                name: displayName,
                avatar: user.image || null,
                googleId: googleId || null,
                role: isAdmin ? "ADMIN" : "USER",
              },
            });
          } else {
            await db.user.update({
              where: { id: existingUser.id },
              data: {
                name: existingUser.name || displayName,
                avatar: user.image || existingUser.avatar,
                googleId: googleId || existingUser.googleId,
                role: isAdmin ? "ADMIN" : existingUser.role,
              },
            });
          }
        } catch (err) {
          console.error("Error synchronizing Google user to database:", err);
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "USER";
        token.phone = (user as any).phone || null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        try {
          const dbUser = token.id
            ? await db.user.findUnique({ where: { id: token.id as string } })
            : session.user.email
            ? await db.user.findUnique({ where: { email: session.user.email } })
            : null;

          if (dbUser) {
            (session.user as any).id = dbUser.id;
            (session.user as any).role = dbUser.role;
            (session.user as any).phone = dbUser.phone;
            session.user.name = dbUser.name || session.user.name;
            session.user.email = dbUser.email || session.user.email;
          } else {
            (session.user as any).id = token.id;
            (session.user as any).role = token.role || "USER";
            (session.user as any).phone = token.phone || null;
          }
        } catch (err) {
          console.error("Session lookup error:", err);
          (session.user as any).id = token.id;
          (session.user as any).role = token.role || "USER";
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };