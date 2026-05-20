import type {
  AnalyzeQaIntelligenceResponse,
  CoverageGapFinding,
  DuplicateBugFinding,
  GeneratedTestCase,
  ReleaseRiskLevel,
  SavedBugReportDto,
  SavedTestCaseBatchDto,
  Severity,
  SeveritySuggestion,
} from '@/types/api';

type AnalyzeProjectInput = {
  bugReports: SavedBugReportDto[];
  testCaseBatches: SavedTestCaseBatchDto[];
};

const severityWeight: Record<Severity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 4,
  CRITICAL: 6,
};

const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'with',
  'when',
  'user',
  'should',
]);

export function analyzeQaProject(input: AnalyzeProjectInput): AnalyzeQaIntelligenceResponse {
  const duplicateBugFindings = detectDuplicateBugs(input.bugReports);
  const coverageGapFindings = detectCoverageGaps(input.bugReports, input.testCaseBatches);
  const severitySuggestions = suggestSeverityChanges(input.bugReports);
  const releaseRisk = scoreReleaseRisk({
    bugReports: input.bugReports,
    testCaseBatches: input.testCaseBatches,
    duplicateBugFindings,
    coverageGapFindings,
    severitySuggestions,
  });

  return {
    duplicateBugFindings,
    coverageGapFindings,
    releaseRisk,
    severitySuggestions,
  };
}

export function detectDuplicateBugs(bugReports: SavedBugReportDto[]): DuplicateBugFinding[] {
  const findings: DuplicateBugFinding[] = [];

  for (let leftIndex = 0; leftIndex < bugReports.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < bugReports.length; rightIndex += 1) {
      const left = bugReports[leftIndex];
      const right = bugReports[rightIndex];
      const fields = compareBugFields(left, right);
      const weightedConfidence = calculateDuplicateConfidence(fields);

      if (weightedConfidence < 0.58) {
        continue;
      }

      const canonical = chooseCanonicalBug(left, right);

      findings.push({
        bugIds: [left.id, right.id],
        confidence: roundScore(weightedConfidence),
        matchingFields: fields
          .filter((field) => field.score >= 0.45)
          .map((field) => field.name),
        recommendedCanonicalBugId: canonical.id,
        reason: `These reports share similar ${fields
          .filter((field) => field.score >= 0.45)
          .map((field) => field.name.toLowerCase())
          .join(', ') || 'bug language'}. Keep the clearer report as canonical.`,
      });
    }
  }

  return findings.sort((left, right) => right.confidence - left.confidence).slice(0, 12);
}

export function detectCoverageGaps(
  bugReports: SavedBugReportDto[],
  testCaseBatches: SavedTestCaseBatchDto[]
): CoverageGapFinding[] {
  const allCases = testCaseBatches.flatMap((batch) =>
    batch.cases.map((testCase) => ({
      batch,
      testCase,
      tokens: tokensForTestCase(testCase, batch),
    }))
  );
  const findings: CoverageGapFinding[] = [];

  for (const bugReport of bugReports) {
    const bugTokens = tokensForBug(bugReport);
    const bestMatch = allCases
      .map((candidate) => ({
        ...candidate,
        score: jaccard(bugTokens, candidate.tokens),
      }))
      .sort((left, right) => right.score - left.score)[0];

    if (!bestMatch || bestMatch.score < 0.24) {
      findings.push({
        title: `Add regression coverage for: ${bugReport.title}`,
        affectedArea: inferArea(bugReport.title, bugReport.summary),
        reason:
          'A saved bug exists without a strongly matching test case in the project history.',
        relatedBugIds: [bugReport.id],
        relatedTestCaseTitles: bestMatch ? [bestMatch.testCase.title] : [],
        suggestedTestCases: buildSuggestedTestsForBug(bugReport),
      });
    }
  }

  for (const batch of testCaseBatches) {
    const caseTypes = new Set(batch.cases.map((testCase) => testCase.caseType));
    const missingTypes = ['NEGATIVE', 'EDGE', 'BOUNDARY'].filter((type) => !caseTypes.has(type as never));

    if (missingTypes.length) {
      findings.push({
        title: `Strengthen ${batch.featureTitle} coverage`,
        affectedArea: batch.featureTitle,
        reason: `This batch is missing ${missingTypes.join(', ')} coverage.`,
        relatedBugIds: [],
        relatedTestCaseTitles: batch.cases.slice(0, 3).map((testCase) => testCase.title),
        suggestedTestCases: missingTypes.map((type) => `${type} scenario for ${batch.featureTitle}`),
      });
    }
  }

  return findings.slice(0, 15);
}

export function suggestSeverityChanges(bugReports: SavedBugReportDto[]): SeveritySuggestion[] {
  return bugReports.flatMap((bugReport) => {
    const inferredSeverity = inferSeverity(bugReport);

    if (inferredSeverity === bugReport.severity) {
      return [];
    }

    const currentWeight = severityWeight[bugReport.severity];
    const inferredWeight = severityWeight[inferredSeverity];

    if (Math.abs(currentWeight - inferredWeight) < 2) {
      return [];
    }

    return [
      {
        bugId: bugReport.id,
        title: bugReport.title,
        currentSeverity: bugReport.severity,
        suggestedSeverity: inferredSeverity,
        confidence: inferredWeight > currentWeight ? 0.78 : 0.66,
        reason: buildSeverityReason(bugReport, inferredSeverity),
      },
    ];
  });
}

function scoreReleaseRisk({
  bugReports,
  testCaseBatches,
  duplicateBugFindings,
  coverageGapFindings,
  severitySuggestions,
}: AnalyzeProjectInput & {
  duplicateBugFindings: DuplicateBugFinding[];
  coverageGapFindings: CoverageGapFinding[];
  severitySuggestions: SeveritySuggestion[];
}) {
  const severityScore = bugReports.reduce(
    (sum, bugReport) => sum + severityWeight[bugReport.severity],
    0
  );
  const testCaseCount = testCaseBatches.reduce((sum, batch) => sum + batch.cases.length, 0);
  const criticalCount = bugReports.filter((bugReport) => bugReport.severity === 'CRITICAL').length;
  const highCount = bugReports.filter((bugReport) => bugReport.severity === 'HIGH').length;
  const coveragePenalty = coverageGapFindings.length * 6;
  const duplicatePenalty = duplicateBugFindings.length * 3;
  const severityPenalty = severitySuggestions.length * 4;
  const testCoverageOffset = Math.min(testCaseCount * 1.2, 18);
  const rawScore =
    severityScore * 7 +
    criticalCount * 10 +
    highCount * 5 +
    coveragePenalty +
    duplicatePenalty +
    severityPenalty -
    testCoverageOffset;
  const score = clamp(Math.round(rawScore), 0, 100);

  return {
    score,
    level: riskLevelForScore(score),
    drivers: buildRiskDrivers({
      bugReports,
      coverageGapFindings,
      duplicateBugFindings,
      severitySuggestions,
      testCaseCount,
    }),
    recommendedActions: buildRiskActions({
      coverageGapFindings,
      duplicateBugFindings,
      severitySuggestions,
      score,
    }),
  };
}

function compareBugFields(left: SavedBugReportDto, right: SavedBugReportDto) {
  return [
    { name: 'Title', score: similarity(left.title, right.title) },
    { name: 'Summary', score: similarity(left.summary, right.summary) },
    { name: 'Actual result', score: similarity(left.actualResult, right.actualResult) },
    { name: 'Expected result', score: similarity(left.expectedResult, right.expectedResult) },
    {
      name: 'Steps',
      score: similarity(left.stepsToReproduce.join(' '), right.stepsToReproduce.join(' ')),
    },
  ];
}

function calculateDuplicateConfidence(fields: Array<{ name: string; score: number }>) {
  const [title, summary, actual, expected, steps] = fields;

  return title.score * 0.32 + summary.score * 0.22 + actual.score * 0.24 + expected.score * 0.1 + steps.score * 0.12;
}

function chooseCanonicalBug(left: SavedBugReportDto, right: SavedBugReportDto) {
  const leftCompleteness = bugCompleteness(left);
  const rightCompleteness = bugCompleteness(right);

  if (leftCompleteness !== rightCompleteness) {
    return leftCompleteness > rightCompleteness ? left : right;
  }

  return new Date(left.createdAt).getTime() <= new Date(right.createdAt).getTime() ? left : right;
}

function bugCompleteness(bugReport: SavedBugReportDto) {
  return [
    bugReport.title,
    bugReport.summary,
    bugReport.expectedResult,
    bugReport.actualResult,
    bugReport.environmentSummary,
    ...bugReport.stepsToReproduce,
  ].filter(Boolean).length;
}

function tokensForBug(bugReport: SavedBugReportDto) {
  return tokenize(
    [
      bugReport.title,
      bugReport.summary,
      bugReport.rawInput,
      bugReport.actualResult,
      bugReport.expectedResult,
      bugReport.stepsToReproduce.join(' '),
    ].join(' ')
  );
}

function tokensForTestCase(testCase: GeneratedTestCase, batch: SavedTestCaseBatchDto) {
  return tokenize(
    [
      batch.featureTitle,
      batch.sourceRequirement,
      batch.acceptanceCriteria,
      testCase.title,
      testCase.expectedResult,
      testCase.preconditions.join(' '),
      testCase.steps.join(' '),
      testCase.tags?.join(' '),
    ].join(' ')
  );
}

function inferSeverity(bugReport: SavedBugReportDto): Severity {
  const text = [
    bugReport.title,
    bugReport.summary,
    bugReport.actualResult,
    bugReport.rawInput,
    bugReport.logsInput,
  ]
    .join(' ')
    .toLowerCase();

  if (matchesAny(text, ['data loss', 'security', 'payment', 'checkout', 'crash', 'unable to login', 'blocked', 'production down'])) {
    return 'CRITICAL';
  }

  if (matchesAny(text, ['cannot', 'failed', 'error', '500', 'broken', 'stuck', 'incorrect total', 'permission'])) {
    return 'HIGH';
  }

  if (matchesAny(text, ['slow', 'confusing', 'validation', 'missing', 'layout', 'minor'])) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function buildSeverityReason(bugReport: SavedBugReportDto, inferredSeverity: Severity) {
  if (severityWeight[inferredSeverity] > severityWeight[bugReport.severity]) {
    return 'The report language suggests stronger user impact than the current severity indicates.';
  }

  return 'The report appears lower impact than the current severity, based on available details.';
}

function buildSuggestedTestsForBug(bugReport: SavedBugReportDto) {
  const area = inferArea(bugReport.title, bugReport.summary);

  return [
    `Regression test for ${area}: reproduce ${bugReport.title}`,
    `Negative path for ${area}: validate the failure state is handled clearly`,
    `Recovery path for ${area}: confirm the user can continue after the issue condition`,
  ];
}

function buildRiskDrivers({
  bugReports,
  coverageGapFindings,
  duplicateBugFindings,
  severitySuggestions,
  testCaseCount,
}: {
  bugReports: SavedBugReportDto[];
  coverageGapFindings: CoverageGapFinding[];
  duplicateBugFindings: DuplicateBugFinding[];
  severitySuggestions: SeveritySuggestion[];
  testCaseCount: number;
}) {
  const drivers: string[] = [];
  const highImpactCount = bugReports.filter((bug) => bug.severity === 'HIGH' || bug.severity === 'CRITICAL').length;

  if (highImpactCount) {
    drivers.push(`${highImpactCount} high-impact bug report(s) remain in project history.`);
  }

  if (coverageGapFindings.length) {
    drivers.push(`${coverageGapFindings.length} coverage gap(s) were detected.`);
  }

  if (duplicateBugFindings.length) {
    drivers.push(`${duplicateBugFindings.length} likely duplicate bug pair(s) may need triage.`);
  }

  if (severitySuggestions.length) {
    drivers.push(`${severitySuggestions.length} bug report(s) may need severity review.`);
  }

  if (!testCaseCount) {
    drivers.push('No saved test cases are available to offset release risk.');
  }

  return drivers.length ? drivers : ['No major risk drivers detected from saved QA assets.'];
}

function buildRiskActions({
  coverageGapFindings,
  duplicateBugFindings,
  severitySuggestions,
  score,
}: {
  coverageGapFindings: CoverageGapFinding[];
  duplicateBugFindings: DuplicateBugFinding[];
  severitySuggestions: SeveritySuggestion[];
  score: number;
}) {
  const actions: string[] = [];

  if (coverageGapFindings.length) {
    actions.push('Add regression tests for the highest-impact uncovered bug reports.');
  }

  if (duplicateBugFindings.length) {
    actions.push('Triage duplicate bug candidates and keep one canonical defect record.');
  }

  if (severitySuggestions.length) {
    actions.push('Review suggested severity changes before release sign-off.');
  }

  if (score >= 70) {
    actions.push('Run a focused regression pass before approving release.');
  }

  return actions.length ? actions : ['Continue monitoring new bugs and keep regression coverage current.'];
}

function inferArea(...values: string[]) {
  const tokens = [...tokenize(values.join(' '))];
  return titleCase(tokens.slice(0, 3).join(' ') || 'General workflow');
}

function similarity(left: string, right: string) {
  return jaccard(tokenize(left), tokenize(right));
}

function jaccard(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) {
    return 0;
  }

  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;

  return intersection / union;
}

function tokenize(value: string | null | undefined) {
  return new Set(
    (value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !stopWords.has(token))
  );
}

function matchesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function riskLevelForScore(score: number): ReleaseRiskLevel {
  if (score >= 80) {
    return 'CRITICAL';
  }

  if (score >= 55) {
    return 'HIGH';
  }

  if (score >= 30) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
