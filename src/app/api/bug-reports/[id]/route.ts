import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { saveBugReportRequestSchema } from "@/lib/validators/bug-report";
import { getCurrentUser } from "@/server/auth/current-user";
import { mapBugReport } from "@/server/services/mappers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return jsonError("UNAUTHORIZED", "You must sign in to view bug reports.", 401);
    }

    const bugReport = await prisma.bugReport.findFirst({
      where: {
        id,
        project: {
          userId: user.id,
        },
      },
    });

    if (!bugReport) {
      return jsonError("BUG_REPORT_NOT_FOUND", "Saved bug report was not found.", 404);
    }

    return NextResponse.json(mapBugReport(bugReport as never), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load bug report.";
    return jsonError("BUG_REPORT_FETCH_FAILED", message, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = saveBugReportRequestSchema.parse(body);
    const user = await getCurrentUser();

    if (!user) {
      return jsonError("UNAUTHORIZED", "You must sign in to update bug reports.", 401);
    }

    const existing = await prisma.bugReport.findFirst({
      where: {
        id,
        project: {
          userId: user.id,
        },
      },
    });

    if (!existing) {
      return jsonError("BUG_REPORT_NOT_FOUND", "Saved bug report was not found.", 404);
    }

    const bugReport = await prisma.bugReport.update({
      where: { id },
      data: {
        projectId: input.projectId,
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
      where: { id: input.projectId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(mapBugReport(bugReport as never), { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("INVALID_JSON", "Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return jsonError("VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request.", 400);
    }

    const message = error instanceof Error ? error.message : "Unable to update bug report.";
    return jsonError("BUG_REPORT_UPDATE_FAILED", message, 500);
  }
}
