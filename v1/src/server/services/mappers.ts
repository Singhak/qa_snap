import type {
  GeneratedTestCase,
  ProjectDetailDto,
  ProjectDto,
  SavedBugReportDto,
  SavedTestCaseBatchDto,
} from '@/types/api';
import type { BugReport, Project, TestCase, TestCaseBatch } from '@prisma/client';

type BugReportRecord = BugReport & {
  stepsToReproduce: string[];
  assumptions: string[];
};

type TestCaseRecord = TestCase & {
  preconditions: string[];
  steps: string[];
  tags: string[] | null;
};

type TestCaseBatchRecord = TestCaseBatch & {
  testCases: TestCaseRecord[];
};

export function mapProject(project: Project): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function mapBugReport(report: BugReportRecord): SavedBugReportDto {
  return {
    id: report.id,
    projectId: report.projectId,
    rawInput: report.rawInput,
    expectedInput: report.expectedInput,
    actualInput: report.actualInput,
    environmentInput: report.environmentInput,
    logsInput: report.logsInput,
    title: report.title,
    summary: report.summary,
    stepsToReproduce: report.stepsToReproduce,
    expectedResult: report.expectedResult,
    actualResult: report.actualResult,
    severity: report.severity,
    priority: report.priority ?? undefined,
    environmentSummary: report.environmentSummary ?? undefined,
    assumptions: report.assumptions,
    confidenceScore: report.confidenceScore ?? undefined,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function mapGeneratedCase(testCase: TestCaseRecord): GeneratedTestCase {
  return {
    title: testCase.title,
    preconditions: testCase.preconditions,
    steps: testCase.steps,
    expectedResult: testCase.expectedResult,
    priority: testCase.priority,
    caseType: testCase.caseType,
    tags: testCase.tags ?? undefined,
  };
}

export function mapTestCaseBatch(batch: TestCaseBatchRecord): SavedTestCaseBatchDto {
  return {
    id: batch.id,
    projectId: batch.projectId,
    featureTitle: batch.featureTitle,
    sourceRequirement: batch.sourceRequirement,
    acceptanceCriteria: batch.acceptanceCriteria,
    generationMode: batch.generationMode,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    cases: batch.testCases.map(mapGeneratedCase),
  };
}

export function mapProjectDetail(args: {
  project: Project;
  bugReports: BugReportRecord[];
  testCaseBatches: TestCaseBatchRecord[];
}): ProjectDetailDto {
  return {
    ...mapProject(args.project),
    bugReports: args.bugReports.map(mapBugReport),
    testCaseBatches: args.testCaseBatches.map(mapTestCaseBatch),
  };
}
