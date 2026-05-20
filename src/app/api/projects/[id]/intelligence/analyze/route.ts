import { type NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { jsonError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { analyzeQaIntelligenceRequestSchema } from '@/lib/validators/qa-intelligence';
import { getCurrentUser } from '@/server/auth/current-user';
import { mapProjectDetail } from '@/server/services/mappers';
import { analyzeQaProject } from '@/server/services/qa-intelligence';
import {
  buildIntelligenceRunData,
  mapQaIntelligenceRun,
  qaIntelligenceRuns,
} from '@/server/services/qa-intelligence-runs';
import { assertRateLimit } from '@/server/services/rate-limit';
import { assertWithinMonthlyQuota } from '@/server/services/quota';
import { createRequestId, logApiEvent, serializeError } from '@/server/monitoring';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  let userId: string | null = null;

  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return jsonError('UNAUTHORIZED', 'You must sign in to analyze QA intelligence.', 401, {
        requestId,
      });
    }

    userId = user.id;
    assertRateLimit({
      key: `qa-intelligence:${user.id}:${id}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    const body = await request.json().catch((error) => {
      if (error instanceof SyntaxError) {
        throw error;
      }

      return {};
    });
    const input = analyzeQaIntelligenceRequestSchema.parse(body);

    if (input.useAiEnrichment) {
      await assertWithinMonthlyQuota(user.id);
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        bugReports: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        testCaseBatches: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            testCases: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
    });

    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', 'Project was not found.', 404, { requestId });
    }

    logApiEvent({
      level: 'info',
      requestId,
      route: `/api/projects/${id}/intelligence/analyze`,
      message: 'QA intelligence analysis started',
      details: {
        userId: user.id,
        projectId: id,
        provider: input.provider,
        useAiEnrichment: input.useAiEnrichment,
      },
    });

    const projectDetail = mapProjectDetail({
      project,
      bugReports: project.bugReports,
      testCaseBatches: project.testCaseBatches,
    });
    const result = analyzeQaProject({
      bugReports: projectDetail.bugReports,
      testCaseBatches: projectDetail.testCaseBatches,
    });
    const testCaseCount = projectDetail.testCaseBatches.reduce(
      (sum, batch) => sum + batch.cases.length,
      0
    );
    const inputSnapshot = {
      provider: input.provider,
      mode: input.mode,
      useAiEnrichment: input.useAiEnrichment,
      bugReportCount: projectDetail.bugReports.length,
      testCaseBatchCount: projectDetail.testCaseBatches.length,
      testCaseCount,
    };

    const run = await qaIntelligenceRuns().create({
      data: buildIntelligenceRunData({
        projectId: project.id,
        userId: user.id,
        provider: input.provider,
        result,
        inputSnapshot,
      }),
    });

    logApiEvent({
      level: 'info',
      requestId,
      route: `/api/projects/${id}/intelligence/analyze`,
      message: 'QA intelligence analysis completed',
      details: {
        userId: user.id,
        projectId: id,
        riskScore: result.releaseRisk.score,
        duplicateCount: result.duplicateBugFindings.length,
        gapCount: result.coverageGapFindings.length,
      },
    });

    return NextResponse.json(mapQaIntelligenceRun(run), { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400, { requestId });
    }

    if (error instanceof ZodError) {
      return jsonError('VALIDATION_ERROR', error.issues[0]?.message ?? 'Invalid request.', 400, {
        requestId,
      });
    }

    const message = error instanceof Error ? error.message : 'Unable to analyze QA intelligence.';
    logApiEvent({
      level: 'error',
      requestId,
      route: '/api/projects/:id/intelligence/analyze',
      message: 'QA intelligence analysis failed',
      details: {
        userId,
        error: serializeError(error),
      },
    });

    return jsonError('QA_INTELLIGENCE_ANALYSIS_FAILED', message, 400, { requestId });
  }
}
