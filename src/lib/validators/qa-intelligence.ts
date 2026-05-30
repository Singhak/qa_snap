import { z } from 'zod';

import { aiProviderSchema } from '@/lib/validators/ai';

export const qaAnalysisModeSchema = z.enum(['FULL_PROJECT']);

export const analyzeQaIntelligenceRequestSchema = z.object({
  provider: aiProviderSchema.optional(),
  mode: qaAnalysisModeSchema.default('FULL_PROJECT'),
  useAiEnrichment: z.boolean().default(false),
});

export type AnalyzeQaIntelligenceRequestInput = z.input<typeof analyzeQaIntelligenceRequestSchema>;
export type AnalyzeQaIntelligenceRequestOutput = z.output<
  typeof analyzeQaIntelligenceRequestSchema
>;
