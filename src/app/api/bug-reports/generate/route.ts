import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError } from "@/lib/api/errors";
import { generateBugReportRequestSchema } from "@/lib/validators/bug-report";
import { getCurrentUser } from "@/server/auth/current-user";
import { generateBugReport } from "@/server/services/bug-report-generator";
import { logGenerationEvent, normalizeGenerationError } from "@/server/services/generation-logging";
import { createRequestId, logApiEvent, serializeError } from "@/server/monitoring";
import { assertWithinMonthlyQuota } from "@/server/services/quota";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  let userId: string | null = null;
  let requestBody: Record<string, unknown> | null = null;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError("UNAUTHORIZED", "You must sign in to generate bug reports.", 401, { requestId });
    }

    userId = user.id;
    await assertWithinMonthlyQuota(user.id);

    requestBody = await request.json();
    const input = generateBugReportRequestSchema.parse(requestBody);
    const output = await generateBugReport(input);

    await logGenerationEvent({
      userId: user.id,
      projectId: input.projectId,
      featureType: "BUG_REPORT",
      provider: input.provider,
      inputSnapshot: input,
      outputSnapshot: output,
      status: "SUCCESS",
    });

    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("INVALID_JSON", "Request body must be valid JSON.", 400, { requestId });
    }

    if (error instanceof ZodError) {
      return jsonError("VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request.", 400, { requestId });
    }

    if (userId) {
      await logGenerationEvent({
        userId,
        projectId: typeof requestBody?.projectId === "string" ? requestBody.projectId : undefined,
        featureType: "BUG_REPORT",
        provider: typeof requestBody?.provider === "string" ? (requestBody.provider as never) : undefined,
        inputSnapshot: requestBody ?? {},
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unable to generate bug report.",
      }).catch(() => undefined);
    }

    const message = normalizeGenerationError(error);
    logApiEvent({
      level: "error",
      requestId,
      route: "/api/bug-reports/generate",
      message: "Bug report generation failed",
      details: {
        userId,
        projectId: requestBody?.projectId,
        provider: requestBody?.provider,
        error: serializeError(error),
      },
    });

    return jsonError("BUG_REPORT_GENERATION_FAILED", message, 400, { requestId });
  }
}
