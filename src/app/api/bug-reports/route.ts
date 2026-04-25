import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { saveBugReportRequestSchema } from "@/lib/validators/bug-report";
import { getOrCreateDemoUser } from "@/server/services/demo-user";
import { mapBugReport } from "@/server/services/mappers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = saveBugReportRequestSchema.parse(body);
    const user = await getOrCreateDemoUser();

    const project = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return jsonError("PROJECT_NOT_FOUND", "Create or select a project before saving.", 404);
    }

    const bugReport = await prisma.bugReport.create({
      data: {
        projectId: project.id,
        createdById: user.id,
        rawInput: input.rawInput,
        expectedInput: input.expectedInput,
        actualInput: input.actualInput,
        environmentInput: input.environmentInput,
        logsInput: input.logsInput,
        title: input.title,
        summary: input.summary,
        stepsToReproduce: input.stepsToReproduce,
        expectedResult: input.expectedResult,
        actualResult: input.actualResult,
        severity: input.severity,
        priority: input.priority,
        environmentSummary: input.environmentSummary,
        assumptions: input.assumptions,
        confidenceScore: input.confidenceScore,
        status: "SAVED",
      },
    });

    await prisma.project.update({
      where: {
        id: project.id,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(mapBugReport(bugReport as never), { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("INVALID_JSON", "Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return jsonError("VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request.", 400);
    }

    const message = error instanceof Error ? error.message : "Unable to save bug report.";
    return jsonError("BUG_REPORT_SAVE_FAILED", message, 500);
  }
}
