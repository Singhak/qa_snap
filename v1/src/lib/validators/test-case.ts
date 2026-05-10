import { z } from 'zod';

export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export const caseTypeSchema = z.enum(['POSITIVE', 'NEGATIVE', 'EDGE', 'BOUNDARY']);
export const generationModeSchema = z.enum(['SMOKE', 'REGRESSION', 'EDGE_HEAVY']);

export const generatedTestCaseSchema = z.object({
  title: z.string().min(3),
  preconditions: z.array(z.string().min(1)).default([]),
  steps: z.array(z.string().min(1)).min(1),
  expectedResult: z.string().min(3),
  priority: prioritySchema,
  caseType: caseTypeSchema,
  tags: z.array(z.string().min(1)).optional(),
});

export const generateTestCasesRequestSchema = z.object({
  projectId: z.string().uuid(),
  featureTitle: z.string().min(3),
  sourceRequirement: z.string().min(10),
  acceptanceCriteria: z.string().min(1).optional(),
  generationMode: generationModeSchema,
});

export const generateTestCasesResponseSchema = z.object({
  cases: z.array(generatedTestCaseSchema).min(1),
});

export const saveTestCaseBatchRequestSchema = generateTestCasesRequestSchema.extend({
  cases: z.array(generatedTestCaseSchema).min(1),
});

export type GenerateTestCasesRequestInput = z.input<typeof generateTestCasesRequestSchema>;
export type GenerateTestCasesResponseOutput = z.output<typeof generateTestCasesResponseSchema>;
export type SaveTestCaseBatchRequestInput = z.input<typeof saveTestCaseBatchRequestSchema>;
