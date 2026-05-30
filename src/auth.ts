import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger'; // Import the logger

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push(
  Credentials({
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      // --- Start of Dev User Logic (Development Only) ---
      if (
        process.env.NODE_ENV === 'development' &&
        credentials?.email === process.env.DEV_USER_EMAIL &&
        credentials?.password === process.env.DEV_USER_PASSWORD
      ) {
        logger.info('Attempting to log in with development user credentials.');

        const devUserEmail = process.env.DEV_USER_EMAIL as string;
        const devUserPlainPassword = process.env.DEV_USER_PASSWORD as string; // This is the plain text password for dev

        let user = await prisma.user.findUnique({
          where: { email: devUserEmail.toLowerCase() },
        });

        if (!user || !user.passwordHash) {
          // If dev user doesn't exist, or exists but has no password (e.g., created via OAuth initially),
          // create/update it with a hashed password.
          logger.info(
            `Development user with email ${devUserEmail} not found or password missing. Creating/updating...`
          );
          const hashedPassword = await bcrypt.hash(devUserPlainPassword, 10);
          user = await prisma.user.upsert({
            where: { email: devUserEmail.toLowerCase() },
            update: { passwordHash: hashedPassword },
            create: {
              email: devUserEmail.toLowerCase(),
              name: 'Dev User', // Default name for dev user
              passwordHash: hashedPassword,
              emailVerified: new Date(), // Mark as verified for convenience
            },
          });
          logger.info(`Development user ${user.email} created/updated successfully.`);
        }

        // Verify the provided plain text password against the stored hash for the dev user.
        const isValid = await bcrypt.compare(devUserPlainPassword, user.passwordHash as string);

        if (isValid) {
          logger.info(`Development user ${user.email} authenticated successfully.`);
          return { id: user.id, email: user.email, name: user.name };
        } else {
          logger.warn(`Failed authentication attempt for development user ${devUserEmail}.`);
        }
      }
      // --- End of Dev User Logic ---

      const parsed = credentialsSchema.safeParse(credentials);

      if (!parsed.success) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: {
          email: parsed.data.email.toLowerCase(),
        },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);

      if (!isValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    },
  })
);

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: authSecret,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/sign-in',
  },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
