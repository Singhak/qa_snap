import { z } from "zod";

export const createProjectRequestSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
});

export const updateProjectRequestSchema = createProjectRequestSchema;

export type CreateProjectRequestInput = z.input<typeof createProjectRequestSchema>;
export type UpdateProjectRequestInput = z.input<typeof updateProjectRequestSchema>;
