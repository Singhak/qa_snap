import { generateAcceptanceCriteriaResponseSchema } from '@/lib/validators/acceptance-criteria';
import { generateAcceptanceCriteria } from './acceptance-criteria-generator';
import { generateStructuredOutput } from './structured-output';
import { fetchJiraIssue } from '@/lib/api/integrations/jira';
import { prisma } from '@/lib/prisma';

jest.mock('./structured-output', () => ({
  generateStructuredOutput: jest.fn(),
}));

jest.mock('@/lib/api/integrations/jira', () => ({
  fetchJiraIssue: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      findFirst: jest.fn(),
    },
  },
}));

describe('acceptance-criteria-generator integration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('successfully generates structured acceptance criteria without Jira key', async () => {
    const mockOutput = {
      featureTitle: 'Cart Checkout Lifecycle',
      scenarios: [
        {
          name: 'Successful checkout redirection',
          given: ['User is logged in', 'User has items in the cart', 'User is on cart page'],
          when: ['User clicks checkout button'],
          then: ['User is redirected to billing page', 'Cart items are locked'],
          tags: ['@smoke', '@happy-path'],
        },
      ],
      rawGherkin: 'Feature: Cart Checkout Lifecycle\n...',
    };

    (generateStructuredOutput as jest.Mock).mockResolvedValue(mockOutput);

    const mockInput = {
      projectId: 'ca5f0128-2497-4832-a52c-5cd6e5b26640',
      storyDescription: 'As a user I want to checkout my items so that I can buy them.',
      contextNotes: 'Checkout must lock items.',
    };

    const result = await generateAcceptanceCriteria(mockInput, 'user-123');

    expect(generateStructuredOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'acceptance_criteria',
        instructions: expect.any(String),
        prompt: expect.any(String),
      })
    );

    const parsed = generateAcceptanceCriteriaResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);

    expect(result.featureTitle).toBe('Cart Checkout Lifecycle');
    expect(result.scenarios[0].name).toBe('Successful checkout redirection');
  });

  it('successfully fetches Jira issue and appends it to description when jiraIssueKey is provided', async () => {
    const mockOutput = {
      featureTitle: 'Jira Story Integration',
      scenarios: [
        {
          name: 'Jira issue integration scenario',
          given: ['User is viewing Jira ticket'],
          when: ['Ticket description is fetched'],
          then: ['Acceptance criteria matches description'],
          tags: ['@jira'],
        },
      ],
      rawGherkin: 'Feature: Jira Story Integration\n...',
    };

    (generateStructuredOutput as jest.Mock).mockResolvedValue(mockOutput);
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({
      id: 'proj-123',
      jiraDomain: 'my-jira.atlassian.net',
      jiraEmail: 'admin@my-jira.com',
      jiraToken: 'token-abc',
    });
    (fetchJiraIssue as jest.Mock).mockResolvedValue({
      key: 'PROJ-123',
      summary: 'Checkout Integration',
      description: 'Implement secure checkout gateway.',
    });

    const mockInput = {
      projectId: 'proj-123',
      storyDescription: 'User manual notes.',
      jiraIssueKey: 'PROJ-123',
    };

    const result = await generateAcceptanceCriteria(mockInput, 'user-123');

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'proj-123',
        userId: 'user-123',
      },
    });

    expect(fetchJiraIssue).toHaveBeenCalledWith({
      domain: 'my-jira.atlassian.net',
      email: 'admin@my-jira.com',
      token: 'token-abc',
      issueKey: 'PROJ-123',
    });

    expect(generateStructuredOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Implement secure checkout gateway.'),
      })
    );

    const parsed = generateAcceptanceCriteriaResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});
