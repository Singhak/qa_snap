import { z } from 'zod';

export const projectIntegrationsSchema = z.object({
  githubToken: z.string().trim().optional().nullable(),
  githubRepo: z
    .string()
    .trim()
    .refine((val) => !val || /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(val), {
      message: 'GitHub repository must be in the format "owner/repo"',
    })
    .optional()
    .nullable(),
  jiraDomain: z
    .string()
    .trim()
    .refine((val) => !val || /^[a-zA-Z0-9.-]+\.atlassian\.net$/.test(val) || /^[a-zA-Z0-9.-]+$/.test(val), {
      message: 'Jira domain must be a valid Atlassian domain or hostname',
    })
    .optional()
    .nullable(),
  jiraEmail: z
    .string()
    .trim()
    .email({ message: 'Invalid email address' })
    .optional()
    .nullable()
    .or(z.literal('')),
  jiraToken: z.string().trim().optional().nullable(),
  jiraProjectKey: z
    .string()
    .trim()
    .max(10)
    .optional()
    .nullable(),
});

export type ProjectIntegrationsInput = z.infer<typeof projectIntegrationsSchema>;
