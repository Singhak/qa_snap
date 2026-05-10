import { notFound } from "next/navigation";

import { TestCaseBatchDetailView } from "@/components/record-details";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth/current-user";
import { mapTestCaseBatch } from "@/server/services/mappers";

export default async function TestCaseBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const batch = await prisma.testCaseBatch.findFirst({
    where: {
      id,
      project: {
        userId: user.id,
      },
    },
    include: {
      testCases: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!batch) {
    notFound();
  }

  return <TestCaseBatchDetailView batch={mapTestCaseBatch(batch as never)} />;
}
