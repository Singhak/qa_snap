import { prisma } from '@/lib/prisma';

const DEMO_USER_EMAIL = 'demo@qa-copilot.local';

export async function getOrCreateDemoUser() {
  return prisma.user.upsert({
    where: {
      email: DEMO_USER_EMAIL,
    },
    update: {},
    create: {
      email: DEMO_USER_EMAIL,
      passwordHash: 'demo-user-no-login',
      name: 'Demo QA User',
    },
  });
}
