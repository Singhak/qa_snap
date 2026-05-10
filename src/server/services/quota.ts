import { prisma } from "@/lib/prisma";

export async function assertWithinMonthlyQuota(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      monthlyQuota: true,
    },
  });

  if (!user) {
    throw new Error("Unable to verify quota for the current user.");
  }

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const usageCount = await prisma.usageEvent.count({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
  });

  if (usageCount >= user.monthlyQuota) {
    throw new Error(
      `Monthly generation quota reached (${user.monthlyQuota}). Upgrade the plan or wait until the next monthly reset.`,
    );
  }
}
