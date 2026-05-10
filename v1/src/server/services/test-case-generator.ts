import {
  type GenerateTestCasesRequestInput,
  generateTestCasesResponseSchema,
  type GenerateTestCasesResponseOutput,
} from '@/lib/validators/test-case';
import { buildTestCasePrompt } from '@/server/prompts/test-case';
import { generateStructuredOutput } from '@/server/services/structured-output';

export async function generateTestCases(
  input: GenerateTestCasesRequestInput
): Promise<GenerateTestCasesResponseOutput> {
  const instructions =
    'Return a structured JSON response containing a list of manual QA test cases that follow the provided schema exactly.';

  return generateStructuredOutput({
    schema: generateTestCasesResponseSchema,
    schemaName: 'test_cases',
    instructions,
    prompt: buildTestCasePrompt(input),
    maxOutputTokens: 2200,
  });
}
