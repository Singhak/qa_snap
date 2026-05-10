import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError } from "@/lib/api/errors";
import { generateTestCasesRequestSchema } from "@/lib/validators/test-case";
import { getCurrentUser } from "@/server/auth/current-user";
import { generateTestCases } from "@/server/services/test-case-generator";
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
      return jsonError("UNAUTHORIZED", "You must sign in to generate test cases.", 401, { requestId });
    }

    userId = user.id;
    await assertWithinMonthlyQuota(user.id);
    requestBody = await request.json();
    const input = generateTestCasesRequestSchema.parse(requestBody);
    const output = await generateTestCases(input);

    await logGenerationEvent({
      userId: user.id,
      projectId: input.projectId,
      featureType: "TEST_CASE",
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
        featureType: "TEST_CASE",
        provider: typeof requestBody?.provider === "string" ? (requestBody.provider as never) : undefined,
        inputSnapshot: requestBody ?? {},
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unable to generate test cases.",
      }).catch(() => undefined);
    }

    const message = normalizeGenerationError(error);
    logApiEvent({
      level: "error",
      requestId,
      route: "/api/test-cases/generate",
      message: "Test case generation failed",
      details: {
        userId,
        projectId: requestBody?.projectId,
        provider: requestBody?.provider,
        error: serializeError(error),
      },
    });

    return jsonError("TEST_CASE_GENERATION_FAILED", message, 400, { requestId });
  }
}
