import type { SavedBugReportDto, SavedTestCaseBatchDto } from '@/types/api';

import {
  analyzeQaProject,
  detectCoverageGaps,
  detectDuplicateBugs,
  suggestSeverityChanges,
} from './qa-intelligence';

const baseDate = '2026-05-16T08:00:00.000Z';

function bug(overrides: Partial<SavedBugReportDto>): SavedBugReportDto {
  return {
    id: 'bug-1',
    projectId: 'project-1',
    rawInput: 'Login spinner stays active after password reset.',
    title: 'Login stuck after password reset',
    summary: 'User cannot login after completing password reset.',
    stepsToReproduce: ['Reset password', 'Return to login', 'Submit new password'],
    expectedResult: 'User reaches dashboard.',
    actualResult: 'Spinner continues forever.',
    severity: 'MEDIUM',
    assumptions: [],
    createdAt: baseDate,
    updatedAt: baseDate,
    ...overrides,
  };
}

function batch(overrides: Partial<SavedTestCaseBatchDto>): SavedTestCaseBatchDto {
  return {
    id: 'batch-1',
    projectId: 'project-1',
    featureTitle: 'Password reset',
    sourceRequirement: 'Users can reset password and sign in with the new password.',
    generationMode: 'REGRESSION',
    createdAt: baseDate,
    updatedAt: baseDate,
    cases: [
      {
        title: 'Reset password with valid token',
        preconditions: ['User has an account'],
        steps: ['Open reset link', 'Set new password'],
        expectedResult: 'Password is changed.',
        priority: 'HIGH',
        caseType: 'POSITIVE',
      },
    ],
    ...overrides,
  };
}

describe('qa-intelligence', () => {
  it('detects likely duplicate bug reports', () => {
    const findings = detectDuplicateBugs([
      bug({ id: 'bug-1' }),
      bug({
        id: 'bug-2',
        title: 'Password reset login stuck on spinner',
        summary: 'After password reset, login never completes and spinner keeps loading.',
        actualResult: 'Loading spinner stays forever.',
      }),
      bug({
        id: 'bug-3',
        title: 'Profile avatar is blurry',
        summary: 'Profile photo appears low resolution.',
        actualResult: 'Avatar image is blurry.',
        severity: 'LOW',
      }),
    ]);

    expect(findings).toHaveLength(1);
    expect(findings[0].bugIds).toEqual(['bug-1', 'bug-2']);
    expect(findings[0].confidence).toBeGreaterThan(0.58);
  });

  it('flags bug areas without matching test coverage', () => {
    const findings = detectCoverageGaps(
      [
        bug({
          id: 'bug-payment',
          title: 'Payment total is incorrect after coupon',
          summary: 'Checkout total does not include the coupon discount.',
          actualResult: 'User is charged the wrong total.',
        }),
      ],
      [batch({ featureTitle: 'Password reset' })]
    );

    expect(findings.some((finding) => finding.relatedBugIds.includes('bug-payment'))).toBe(true);
  });

  it('raises release risk for critical bugs and uncovered gaps', () => {
    const result = analyzeQaProject({
      bugReports: [
        bug({
          id: 'bug-critical',
          severity: 'CRITICAL',
          title: 'Checkout payment fails',
          summary: 'Payment cannot complete.',
          actualResult: 'Checkout is blocked.',
        }),
      ],
      testCaseBatches: [],
    });

    expect(result.releaseRisk.score).toBeGreaterThanOrEqual(55);
    expect(['HIGH', 'CRITICAL']).toContain(result.releaseRisk.level);
    expect(result.coverageGapFindings.length).toBeGreaterThan(0);
  });

  it('suggests severity review when impact language is stronger than current severity', () => {
    const suggestions = suggestSeverityChanges([
      bug({
        id: 'bug-security',
        severity: 'LOW',
        title: 'Security permission bypass allows access',
        summary: 'A user can access restricted account data.',
        actualResult: 'Restricted data is visible.',
      }),
    ]);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].suggestedSeverity).toBe('CRITICAL');
  });
});
