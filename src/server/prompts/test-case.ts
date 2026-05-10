import type { GenerateTestCasesRequestInput } from '@/lib/validators/test-case';

const modeInstructions: Record<GenerateTestCasesRequestInput['generationMode'], string> = {
  SMOKE: 'Focus on critical happy-path coverage and release-blocking checks.',
  REGRESSION:
    'Provide broad practical coverage across normal, negative, and integration scenarios.',
  EDGE_HEAVY: 'Emphasize edge cases, boundary conditions, validation, and failure handling.',
};

export function buildTestCasePrompt(input: GenerateTestCasesRequestInput) {
  const textAttachments =
    input.attachments?.filter((attachment) => attachment.kind === 'TEXT') ?? [];
  const imageAttachments =
    input.attachments?.filter((attachment) => attachment.kind === 'IMAGE') ?? [];

  return [
    'You are a QA test designer creating manual test cases for a product team.',
    'Generate realistic, non-duplicative test cases that a tester can execute immediately.',
    'Cover positive, negative, edge, and boundary scenarios when appropriate.',
    'Use any attached source material such as UI designs, requirement documents, and QA notes as authoritative context.',
    modeInstructions[input.generationMode],
    '',
    `Feature title: ${input.featureTitle}`,
    `Requirement: ${input.sourceRequirement}`,
    `Acceptance criteria: ${input.acceptanceCriteria ?? 'Not provided'}`,
    `Additional QA notes: ${input.contextNotes ?? 'Not provided'}`,
    `Requested generation mode: ${input.generationMode}`,
    '',
    `Attached design images: ${imageAttachments.length ? imageAttachments.map((attachment) => attachment.name).join(', ') : 'None'}`,
    '',
    textAttachments.length
      ? [
          'Attached text documents:',
          ...textAttachments.map((attachment, index) =>
            [
              `Document ${index + 1}: ${attachment.name} (${attachment.mimeType})`,
              truncateText(attachment.textContent ?? '', 5000),
            ].join('\n')
          ),
        ].join('\n\n')
      : 'Attached text documents: None',
  ].join('\n');
}

function truncateText(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit)}\n[truncated]`;
}
