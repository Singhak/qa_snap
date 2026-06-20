import { z } from 'zod';

import { optionalSanitizedText, sanitizedText } from '@/lib/sanitization';
import { aiProviderSchema } from '@/lib/validators/ai';

export const generateAcceptanceCriteriaRequestSchema = z.object({
  projectId: z.string().uuid(),
  storyDescription: sanitizedText({ min: 10, max: 12000 }),
  jiraIssueKey: z.string().trim().min(1).max(50).optional(),
  contextNotes: optionalSanitizedText({ min: 1, max: 4000 }),
  provider: aiProviderSchema.optional(),
});

export const gherkinScenarioSchema = z.object({
  name: sanitizedText({ min: 3, max: 200, preserveLineBreaks: false }),
  given: z.array(sanitizedText({ min: 1, max: 1000 })).default([]),
  when: z.array(sanitizedText({ min: 1, max: 1000 })).default([]),
  then: z.array(sanitizedText({ min: 1, max: 1000 })).default([]),
  tags: z.array(sanitizedText({ min: 1, max: 50, preserveLineBreaks: false })).optional(),
});

export const generateAcceptanceCriteriaResponseSchema = z.object({
  featureTitle: sanitizedText({ min: 3, max: 200, preserveLineBreaks: false }),
  scenarios: z.array(gherkinScenarioSchema).min(1),
  rawGherkin: z.string(),
});

export type GenerateAcceptanceCriteriaRequestInput = z.input<
  typeof generateAcceptanceCriteriaRequestSchema
>;
export type GenerateAcceptanceCriteriaRequestOutput = z.output<
  typeof generateAcceptanceCriteriaRequestSchema
>;
export type GenerateAcceptanceCriteriaResponseOutput = z.output<
  typeof generateAcceptanceCriteriaResponseSchema
>;
