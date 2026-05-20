import { Prisma } from '@prisma/client';
import type { QaIntelligenceRun } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type {
  AnalyzeQaIntelligenceRequest,
  AnalyzeQaIntelligenceResponse,
  CoverageGapFinding,
  DuplicateBugFinding,
  QaIntelligenceRunDto,
  ReleaseRiskScore,
  SeveritySuggestion,
} from '@/types/api';

type QaIntelligenceRunRecord = QaIntelligenceRun & {
  duplicateBugFindings: Prisma.JsonValue;
  coverageGapFindings: Prisma.JsonValue;
  releaseRisk: Prisma.JsonValue;
  severitySuggestions: Prisma.JsonValue;
  inputSnapshot: Prisma.JsonValue;
};

export function qaIntelligenceRuns() {
  return prisma.qaIntelligenceRun;
}

export function mapQaIntelligenceRun(record: QaIntelligenceRunRecord): QaIntelligenceRunDto {
  return {
    id: record.id,
    projectId: record.projectId,
    provider: (record.provider as QaIntelligenceRunDto['provider']) ?? null,
    status: record.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
    duplicateBugFindings: parseDuplicateFindings(record.duplicateBugFindings),
    coverageGapFindings: parseCoverageFindings(record.coverageGapFindings),
    releaseRisk: parseReleaseRisk(record.releaseRisk),
    severitySuggestions: parseSeveritySuggestions(record.severitySuggestions),
    inputSnapshot: parseInputSnapshot(record.inputSnapshot),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function buildIntelligenceRunData({
  projectId,
  userId,
  provider,
  result,
  inputSnapshot,
}: {
  projectId: string;
  userId: string;
  provider?: string;
  result: AnalyzeQaIntelligenceResponse;
  inputSnapshot: QaIntelligenceRunDto['inputSnapshot'];
}) {
  return {
    projectId,
    createdById: userId,
    provider,
    status: 'SUCCESS',
    duplicateBugFindings: result.duplicateBugFindings as unknown as Prisma.InputJsonValue,
    coverageGapFindings: result.coverageGapFindings as unknown as Prisma.InputJsonValue,
    releaseRisk: result.releaseRisk as unknown as Prisma.InputJsonValue,
    severitySuggestions: result.severitySuggestions as unknown as Prisma.InputJsonValue,
    inputSnapshot: inputSnapshot as unknown as Prisma.InputJsonValue,
  };
}

function parseDuplicateFindings(value: Prisma.JsonValue): DuplicateBugFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    return [
      {
        bugIds: parseStringArray(item.bugIds),
        confidence: parseNumber(item.confidence),
        matchingFields: parseStringArray(item.matchingFields),
        recommendedCanonicalBugId: parseString(item.recommendedCanonicalBugId),
        reason: parseString(item.reason),
      },
    ];
  });
}

function parseCoverageFindings(value: Prisma.JsonValue): CoverageGapFinding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    return [
      {
        title: parseString(item.title),
        affectedArea: parseString(item.affectedArea),
        reason: parseString(item.reason),
        relatedBugIds: parseStringArray(item.relatedBugIds),
        relatedTestCaseTitles: parseStringArray(item.relatedTestCaseTitles),
        suggestedTestCases: parseStringArray(item.suggestedTestCases),
      },
    ];
  });
}

function parseReleaseRisk(value: Prisma.JsonValue): ReleaseRiskScore {
  if (!isRecord(value)) {
    return {
      score: 0,
      level: 'LOW',
      drivers: [],
      recommendedActions: [],
    };
  }

  const level = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(parseString(value.level))
    ? (parseString(value.level) as ReleaseRiskScore['level'])
    : 'LOW';

  return {
    score: parseNumber(value.score),
    level,
    drivers: parseStringArray(value.drivers),
    recommendedActions: parseStringArray(value.recommendedActions),
  };
}

function parseSeveritySuggestions(value: Prisma.JsonValue): SeveritySuggestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    return [
      {
        bugId: parseString(item.bugId),
        title: parseString(item.title),
        currentSeverity: parseSeverity(item.currentSeverity),
        suggestedSeverity: parseSeverity(item.suggestedSeverity),
        confidence: parseNumber(item.confidence),
        reason: parseString(item.reason),
      },
    ];
  });
}

function parseInputSnapshot(value: Prisma.JsonValue): QaIntelligenceRunDto['inputSnapshot'] {
  if (!isRecord(value)) {
    return {
      mode: 'FULL_PROJECT',
      bugReportCount: 0,
      testCaseBatchCount: 0,
      testCaseCount: 0,
    };
  }

  return {
    provider:
      typeof value.provider === 'string'
        ? (value.provider as AnalyzeQaIntelligenceRequest['provider'])
        : undefined,
    mode: value.mode === 'FULL_PROJECT' ? 'FULL_PROJECT' : 'FULL_PROJECT',
    useAiEnrichment: typeof value.useAiEnrichment === 'boolean' ? value.useAiEnrichment : false,
    bugReportCount: parseNumber(value.bugReportCount),
    testCaseBatchCount: parseNumber(value.testCaseBatchCount),
    testCaseCount: parseNumber(value.testCaseCount),
  };
}

function isRecord(value: Prisma.JsonValue): value is Record<string, Prisma.JsonValue> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseStringArray(value: Prisma.JsonValue | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function parseString(value: Prisma.JsonValue | undefined) {
  return typeof value === 'string' ? value : '';
}

function parseNumber(value: Prisma.JsonValue | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseSeverity(value: Prisma.JsonValue | undefined): SeveritySuggestion['currentSeverity'] {
  return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'CRITICAL'
    ? value
    : 'LOW';
}
