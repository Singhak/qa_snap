import {
  type GenerateBugReportRequestInput,
  generateBugReportResponseSchema,
  type GenerateBugReportResponseOutput,
} from "@/lib/validators/bug-report";
import { buildBugReportPrompt } from "@/server/prompts/bug-report";
import { generateStructuredOutput } from "@/server/services/structured-output";

export async function generateBugReport(
  input: GenerateBugReportRequestInput,
): Promise<GenerateBugReportResponseOutput> {
  const instructions =
    "Return a structured QA bug report in JSON that follows the provided schema exactly.";

  return generateStructuredOutput({
    schema: generateBugReportResponseSchema,
    schemaName: "bug_report",
    instructions,
    prompt: buildBugReportPrompt(input),
    maxOutputTokens: 1200,
  });
}
