import { prisma } from '@/lib/prisma';
import { fetchJiraIssue } from '@/lib/api/integrations/jira';
import {
  type GenerateAcceptanceCriteriaRequestOutput,
  generateAcceptanceCriteriaResponseSchema,
  type GenerateAcceptanceCriteriaResponseOutput,
} from '@/lib/validators/acceptance-criteria';
import { buildAcceptanceCriteriaPrompt } from '@/server/prompts/acceptance-criteria';
import { generateStructuredOutput } from '@/server/services/structured-output';

export async function generateAcceptanceCriteria(
  input: GenerateAcceptanceCriteriaRequestOutput,
  userId: string
): Promise<GenerateAcceptanceCriteriaResponseOutput> {
  let storyDescription = input.storyDescription;

  if (input.jiraIssueKey) {
    const project = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error('Project not found.');
    }

    const { jiraDomain, jiraEmail, jiraToken } = project;

    if (!jiraDomain || !jiraToken) {
      throw new Error(
        'Jira integration is not configured. Please add your Jira domain and token in Project settings.'
      );
    }

    const jiraIssue = await fetchJiraIssue({
      domain: jiraDomain,
      email: jiraEmail,
      token: jiraToken,
      issueKey: input.jiraIssueKey,
    });

    const jiraContent = [
      `Jira Issue: ${jiraIssue.key}`,
      `Summary: ${jiraIssue.summary}`,
      `Description: ${jiraIssue.description}`,
    ].join('\n');

    storyDescription = `${jiraContent}\n\nUser Input Description:\n${storyDescription}`;
  }

  const instructions =
    'Return a structured Acceptance Criteria in JSON that follows the provided schema exactly, including scenarios and a raw Gherkin formatted string.';

  const promptInput = {
    ...input,
    storyDescription,
  };

  return generateStructuredOutput({
    schema: generateAcceptanceCriteriaResponseSchema,
    schemaName: 'acceptance_criteria',
    instructions,
    prompt: buildAcceptanceCriteriaPrompt(promptInput),
    provider: input.provider,
    maxOutputTokens: 2000,
  });
}
