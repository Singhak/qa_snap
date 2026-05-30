import { generateBugReportResponseSchema } from '@/lib/validators/bug-report';
import { generateBugReport } from './bug-report-generator';
import { generateStructuredOutput } from './structured-output';

// Mock the structured output service
jest.mock('./structured-output', () => ({
  generateStructuredOutput: jest.fn(),
}));

describe('bug-report-generator integration', () => {
  it('successfully generates a structured bug report that passes schema validation', async () => {
    // Setup a valid fixture matching the Zod schema
    const mockBugReportOutput = {
      title: 'Checkout button fails to respond on click',
      summary:
        'When clicking the checkout button in the cart, the system does not redirect or show any loading states.',
      stepsToReproduce: [
        'Navigate to the shopping cart page',
        'Add items to the cart',
        'Click the checkout button',
      ],
      expectedResult: 'User is redirected to the billing page with correct items.',
      actualResult: 'Button click yields no action, and no error message is visible.',
      severity: 'HIGH' as const,
      priority: 'HIGH' as const,
      environmentSummary: 'Chrome 124.0, Windows 11',
      assumptions: ['The backend cart endpoint might be failing or slow to respond'],
      confidenceScore: 0.95,
    };

    // Make the mock return our valid fixture
    (generateStructuredOutput as jest.Mock).mockResolvedValue(mockBugReportOutput);

    // Provide a valid request payload
    const mockInput = {
      projectId: 'ca5f0128-2497-4832-a52c-5cd6e5b26640',
      rawInput: "The checkout button doesn't work at all when clicked. Please fix this.",
      expectedInput: 'Checkout goes to checkout page',
      actualInput: 'Nothing happens',
      environmentInput: 'Chrome, Windows',
    };

    // Execute the service under test
    const result = await generateBugReport(mockInput);

    // Assert generateStructuredOutput was called correctly
    expect(generateStructuredOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: 'bug_report',
        instructions: expect.any(String),
        prompt: expect.any(String),
      })
    );

    // Validate returned shape using Zod schema
    const parsed = generateBugReportResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);

    // Verify exact content
    expect(result.title).toBe('Checkout button fails to respond on click');
    expect(result.severity).toBe('HIGH');
    expect(result.priority).toBe('HIGH');
  });
});
