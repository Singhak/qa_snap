import bcrypt from 'bcryptjs';

import { prisma } from '@/lib/prisma';

export const DEV_USER_EMAIL = process.env.DEV_LOGIN_EMAIL ?? 'dev@qacopilot.local';
export const DEV_USER_PASSWORD = process.env.DEV_LOGIN_PASSWORD ?? 'Password123!';
export const DEV_USER_NAME = process.env.DEV_LOGIN_NAME ?? 'QA Copilot Dev';

export async function ensureDevUser() {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const email = DEV_USER_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(DEV_USER_PASSWORD, 12);

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!existingUser) {
    return prisma.user.create({
      data: {
        name: DEV_USER_NAME,
        email,
        passwordHash,
      },
    });
  }

  if (!existingUser.passwordHash || existingUser.name !== DEV_USER_NAME) {
    return prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        name: DEV_USER_NAME,
        passwordHash,
      },
    });
  }

  return existingUser;
}
