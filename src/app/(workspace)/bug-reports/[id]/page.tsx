import { notFound } from "next/navigation";

import { BugReportDetailView } from "@/components/record-details";
import { prisma } from "@/lib/prisma";
import { getOrCreateDemoUser } from "@/server/services/demo-user";
import { mapBugReport } from "@/server/services/mappers";

export default async function BugReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getOrCreateDemoUser();

  const report = await prisma.bugReport.findFirst({
    where: {
      id,
      project: {
        userId: user.id,
      },
    },
  });

  if (!report) {
    notFound();
  }

  return <BugReportDetailView report={mapBugReport(report as never)} />;
}
