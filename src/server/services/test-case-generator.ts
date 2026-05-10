import {
  type GenerateTestCasesRequestInput,
  generateTestCasesResponseSchema,
  type GenerateTestCasesResponseOutput,
} from "@/lib/validators/test-case";
import { buildTestCasePrompt } from "@/server/prompts/test-case";
import { generateStructuredOutput } from "@/server/services/structured-output";

export async function generateTestCases(
  input: GenerateTestCasesRequestInput,
): Promise<GenerateTestCasesResponseOutput> {
  const instructions =
    "Return a structured JSON response containing a list of manual QA test cases that follow the provided schema exactly.";
  const prompt = buildTestCasePrompt(input);
  const imageAttachments = input.attachments?.filter((attachment) => attachment.kind === "IMAGE") ?? [];

  return generateStructuredOutput({
    schema: generateTestCasesResponseSchema,
    schemaName: "test_cases",
    instructions,
    prompt,
    provider: input.provider,
    inputContent: [
      {
        type: "input_text",
        text: prompt,
      },
      ...imageAttachments
        .filter((attachment) => attachment.imageDataUrl)
        .map((attachment) => ({
          type: "input_image" as const,
          image_url: attachment.imageDataUrl as string,
          detail: "high" as const,
        })),
    ],
    maxOutputTokens: 2200,
  });
}
