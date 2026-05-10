import type { GenerateTestCasesRequestInput } from '@/lib/validators/test-case';

const modeInstructions: Record<GenerateTestCasesRequestInput['generationMode'], string> = {
  SMOKE: 'Focus on critical happy-path coverage and release-blocking checks.',
  REGRESSION:
    'Provide broad practical coverage across normal, negative, and integration scenarios.',
  EDGE_HEAVY: 'Emphasize edge cases, boundary conditions, validation, and failure handling.',
};

export function buildTestCasePrompt(input: GenerateTestCasesRequestInput) {
  return [
    'You are a QA test designer creating manual test cases for a product team.',
    'Generate realistic, non-duplicative test cases that a tester can execute immediately.',
    'Cover positive, negative, edge, and boundary scenarios when appropriate.',
    modeInstructions[input.generationMode],
    '',
    `Feature title: ${input.featureTitle}`,
    `Requirement: ${input.sourceRequirement}`,
    `Acceptance criteria: ${input.acceptanceCriteria ?? 'Not provided'}`,
    `Requested generation mode: ${input.generationMode}`,
  ].join('\n');
}
