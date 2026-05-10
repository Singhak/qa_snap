import { z } from 'zod';
import { aiProviderSchema } from '@/lib/validators/ai';

export const severitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const generateBugReportRequestSchema = z.object({
  projectId: z.string().uuid(),
  rawInput: z.string().min(10),
  expectedInput: z.string().min(1).optional(),
  actualInput: z.string().min(1).optional(),
  environmentInput: z.string().min(1).optional(),
  logsInput: z.string().min(1).optional(),
  provider: aiProviderSchema.optional(),
});

export const generateBugReportResponseSchema = z.object({
  title: z.string().min(3),
  summary: z.string().min(10),
  stepsToReproduce: z.array(z.string().min(1)).min(1),
  expectedResult: z.string().min(3),
  actualResult: z.string().min(3),
  severity: severitySchema,
  priority: prioritySchema.nullable(),
  environmentSummary: z.string().min(1).nullable(),
  assumptions: z.array(z.string().min(1)).default([]),
  confidenceScore: z.number().min(0).max(1).nullable(),
});

export const saveBugReportRequestSchema = generateBugReportRequestSchema.merge(
  generateBugReportResponseSchema
);

export type GenerateBugReportRequestInput = z.input<typeof generateBugReportRequestSchema>;
export type GenerateBugReportResponseOutput = z.output<typeof generateBugReportResponseSchema>;
export type SaveBugReportRequestInput = z.input<typeof saveBugReportRequestSchema>;
