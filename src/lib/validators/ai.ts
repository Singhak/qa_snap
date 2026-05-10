import { z } from 'zod';

export const aiProviderSchema = z.enum(['OPENAI', 'OPENROUTER', 'GEMINI', 'ANTHROPIC']);

export type AIProvider = z.infer<typeof aiProviderSchema>;
