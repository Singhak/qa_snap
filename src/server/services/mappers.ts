import type {
  GeneratedTestCase,
  ProjectDetailDto,
  ProjectDto,
  SavedBugReportDto,
  SavedTestCaseBatchDto,
  TestCaseSourceAttachment,
  UserSettingsDto,
} from '@/types/api';
import type { BugReport, Prisma, Project, TestCase, TestCaseBatch, User } from '@prisma/client';

type BugReportRecord = BugReport & {
  stepsToReproduce: Prisma.JsonValue;
  assumptions: Prisma.JsonValue;
};

type TestCaseRecord = TestCase & {
  preconditions: Prisma.JsonValue;
  steps: Prisma.JsonValue;
  tags: Prisma.JsonValue | null;
};

type TestCaseBatchRecord = TestCaseBatch & {
  contextNotes: string | null;
  provider: string | null;
  sourceMaterials: Prisma.JsonValue | null;
  testCases: TestCaseRecord[];
};

type UserSettingsRecord = Pick<User, 'id' | 'name' | 'email' | 'preferredProvider'>;

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
    stepsToReproduce: parseStringArray(report.stepsToReproduce),
    expectedResult: report.expectedResult,
    actualResult: report.actualResult,
    severity: report.severity,
    priority: report.priority ?? undefined,
    environmentSummary: report.environmentSummary ?? undefined,
    assumptions: parseStringArray(report.assumptions),
    confidenceScore: report.confidenceScore ?? undefined,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function mapGeneratedCase(testCase: TestCaseRecord): GeneratedTestCase {
  return {
    title: testCase.title,
    preconditions: parseStringArray(testCase.preconditions),
    steps: parseStringArray(testCase.steps),
    expectedResult: testCase.expectedResult,
    priority: testCase.priority,
    caseType: testCase.caseType,
    tags: parseOptionalStringArray(testCase.tags),
  };
}

export function mapTestCaseBatch(batch: TestCaseBatchRecord): SavedTestCaseBatchDto {
  const sourceMaterials = parseSourceMaterials(batch.sourceMaterials);

  return {
    id: batch.id,
    projectId: batch.projectId,
    featureTitle: batch.featureTitle,
    sourceRequirement: batch.sourceRequirement,
    acceptanceCriteria: batch.acceptanceCriteria,
    contextNotes: batch.contextNotes,
    sourceMaterials,
    provider: (batch.provider as SavedTestCaseBatchDto['provider']) ?? null,
    generationMode: batch.generationMode,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
    cases: batch.testCases.map(mapGeneratedCase),
  };
}

export function mapUserSettings(user: UserSettingsRecord): UserSettingsDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    preferredProvider: (user.preferredProvider as UserSettingsDto['preferredProvider']) ?? null,
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

function parseSourceMaterials(value: Prisma.JsonValue | null): TestCaseSourceAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const attachment = toSourceAttachment(item);

    if (!attachment) {
      return [];
    }

    return [attachment];
  });
}

function parseStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function parseOptionalStringArray(value: Prisma.JsonValue | null): string[] | undefined {
  if (value === null) {
    return undefined;
  }

  return parseStringArray(value);
}

function toSourceAttachment(value: Prisma.JsonValue): TestCaseSourceAttachment | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, Prisma.JsonValue>;

  if (
    typeof record.id !== 'string' ||
    typeof record.name !== 'string' ||
    typeof record.mimeType !== 'string' ||
    (record.kind !== 'TEXT' && record.kind !== 'IMAGE') ||
    (record.textContent !== undefined && typeof record.textContent !== 'string') ||
    (record.imageDataUrl !== undefined && typeof record.imageDataUrl !== 'string')
  ) {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    mimeType: record.mimeType,
    kind: record.kind,
    ...(typeof record.textContent === 'string' ? { textContent: record.textContent } : {}),
    ...(typeof record.imageDataUrl === 'string' ? { imageDataUrl: record.imageDataUrl } : {}),
  } satisfies TestCaseSourceAttachment;
}
