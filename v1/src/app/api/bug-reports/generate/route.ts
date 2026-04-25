import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError } from "@/lib/api/errors";
import { generateBugReportRequestSchema } from "@/lib/validators/bug-report";
import { generateBugReport } from "@/server/services/bug-report-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = generateBugReportRequestSchema.parse(body);
    const output = await generateBugReport(input);

    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("INVALID_JSON", "Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return jsonError("VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request.", 400);
    }

    const message =
      error instanceof Error ? error.message : "Unable to generate bug report.";

    return jsonError("BUG_REPORT_GENERATION_FAILED", message, 400);
  }
}
