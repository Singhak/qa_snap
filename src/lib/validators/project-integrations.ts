import { z } from 'zod';

import { optionalSanitizedIdentifier } from '@/lib/sanitization';

export const projectIntegrationsSchema = z.object({
  githubToken: optionalSanitizedIdentifier({ max: 500 }).nullable(),
  githubRepo: optionalSanitizedIdentifier({ max: 200 })
    .refine((val) => !val || /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(val), {
      message: 'GitHub repository must be in the format "owner/repo"',
    })
    .nullable(),
  jiraDomain: optionalSanitizedIdentifier({ max: 253 })
    .refine(
      (val) => !val || /^[a-zA-Z0-9.-]+\.atlassian\.net$/.test(val) || /^[a-zA-Z0-9.-]+$/.test(val),
      {
        message: 'Jira domain must be a valid Atlassian domain or hostname',
      }
    )
    .nullable(),
  jiraEmail: optionalSanitizedIdentifier({ max: 254 })
    .pipe(z.string().email({ message: 'Invalid email address' }).optional())
    .nullable()
    .or(z.literal('')),
  jiraToken: optionalSanitizedIdentifier({ max: 500 }).nullable(),
  jiraProjectKey: optionalSanitizedIdentifier({ max: 10 }).nullable(),
});

export type ProjectIntegrationsInput = z.infer<typeof projectIntegrationsSchema>;
