import { sanitizeUserContent } from '@/lib/sanitization';
import { formatBugReportAsCsv } from '@/lib/bug-report-exports';
import { generateBugReportRequestSchema } from '@/lib/validators/bug-report';

describe('user content sanitization', () => {
  it('removes dangerous markup and control characters from text input', () => {
    const sanitized = sanitizeUserContent(
      ' Login\u202E issue <script>alert("xss")</script><img src=x onerror=alert(1)> still broken '
    );

    expect(sanitized).toBe('Login issue still broken');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('onerror');
    expect(sanitized).not.toContain('\u202E');
  });

  it('sanitizes bug generation request fields before downstream use', () => {
    const parsed = generateBugReportRequestSchema.parse({
      projectId: '11111111-1111-1111-1111-111111111111',
      rawInput:
        'Checkout fails after payment confirmation <iframe src="https://evil.test"></iframe>',
      expectedInput: '<b>Order should complete</b>',
      actualInput: ' javascript:alert(1) error shown ',
      environmentInput: '',
      logsInput: '',
    });

    expect(parsed.rawInput).toBe('Checkout fails after payment confirmation');
    expect(parsed.expectedInput).toBe('Order should complete');
    expect(parsed.actualInput).toBe('alert(1) error shown');
    expect(parsed.environmentInput).toBeUndefined();
    expect(parsed.logsInput).toBeUndefined();
  });

  it('neutralizes spreadsheet formulas in CSV exports', () => {
    const csv = formatBugReportAsCsv({
      title: '=IMPORTXML("https://evil.test")',
      severity: 'HIGH',
      priority: undefined,
      environmentSummary: undefined,
      summary: '+cmd',
      rawInput: '@payload',
      stepsToReproduce: ['-malicious formula'],
      expectedResult: 'Safe result',
      actualResult: 'Unsafe result',
      assumptions: [],
    });

    expect(csv).toContain("'=IMPORTXML");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'@payload");
    expect(csv).toContain("'-malicious formula");
  });
});
