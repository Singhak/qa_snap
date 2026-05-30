import { z } from 'zod';

import { optionalSanitizedText, sanitizedText } from '@/lib/sanitization';
import { aiProviderSchema } from '@/lib/validators/ai';

export const severitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const generateBugReportRequestSchema = z.object({
  projectId: z.string().uuid(),
  rawInput: sanitizedText({ min: 10, max: 12000 }),
  expectedInput: optionalSanitizedText({ min: 1, max: 4000 }),
  actualInput: optionalSanitizedText({ min: 1, max: 4000 }),
  environmentInput: optionalSanitizedText({ min: 1, max: 2000 }),
  logsInput: optionalSanitizedText({ min: 1, max: 12000 }),
  provider: aiProviderSchema.optional(),
});

export const generateBugReportResponseSchema = z.object({
  title: sanitizedText({ min: 3, max: 180, preserveLineBreaks: false }),
  summary: sanitizedText({ min: 10, max: 2500 }),
  stepsToReproduce: z.array(sanitizedText({ min: 1, max: 1000 })).min(1),
  expectedResult: sanitizedText({ min: 3, max: 2500 }),
  actualResult: sanitizedText({ min: 3, max: 2500 }),
  severity: severitySchema,
  priority: prioritySchema.nullable(),
  environmentSummary: sanitizedText({ min: 1, max: 2000 }).nullable(),
  assumptions: z.array(sanitizedText({ min: 1, max: 1000 })).default([]),
  confidenceScore: z.number().min(0).max(1).nullable(),
});

export const saveBugReportRequestSchema = generateBugReportRequestSchema.merge(
  generateBugReportResponseSchema
);

export type GenerateBugReportRequestInput = z.input<typeof generateBugReportRequestSchema>;
export type GenerateBugReportRequestOutput = z.output<typeof generateBugReportRequestSchema>;
export type GenerateBugReportResponseOutput = z.output<typeof generateBugReportResponseSchema>;
export type SaveBugReportRequestInput = z.input<typeof saveBugReportRequestSchema>;
