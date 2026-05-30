import { z } from 'zod';

import { optionalSanitizedText, sanitizedText } from '@/lib/sanitization';

export const createProjectRequestSchema = z.object({
  name: sanitizedText({ min: 2, max: 80, preserveLineBreaks: false }),
  description: optionalSanitizedText({ max: 500 }),
});

export const updateProjectRequestSchema = createProjectRequestSchema;

export type CreateProjectRequestInput = z.input<typeof createProjectRequestSchema>;
export type UpdateProjectRequestInput = z.input<typeof updateProjectRequestSchema>;
