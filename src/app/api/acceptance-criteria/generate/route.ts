import { type NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { jsonError } from '@/lib/api/errors';
import { generateAcceptanceCriteriaRequestSchema } from '@/lib/validators/acceptance-criteria';
import { getCurrentUser } from '@/server/auth/current-user';
import { generateAcceptanceCriteria } from '@/server/services/acceptance-criteria-generator';
import { logGenerationEvent, normalizeGenerationError } from '@/server/services/generation-logging';
import { createRequestId, logApiEvent, serializeError } from '@/server/monitoring';
import { assertWithinMonthlyQuota } from '@/server/services/quota';
import { assertRateLimit } from '@/server/services/rate-limit';

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  let userId: string | null = null;
  let requestBody: Record<string, unknown> | null = null;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError('UNAUTHORIZED', 'You must sign in to generate acceptance criteria.', 401, {
        requestId,
      });
    }

    userId = user.id;
    assertRateLimit({
      key: `acceptance-criteria:${user.id}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    await assertWithinMonthlyQuota(user.id);

    requestBody = await request.json();
    const input = generateAcceptanceCriteriaRequestSchema.parse(requestBody);
    const output = await generateAcceptanceCriteria(input, user.id);

    await logGenerationEvent({
      userId: user.id,
      projectId: input.projectId,
      featureType: 'TEST_CASE',
      provider: input.provider,
      inputSnapshot: input,
      outputSnapshot: output,
      status: 'SUCCESS',
    });

    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400, { requestId });
    }

    if (error instanceof ZodError) {
      return jsonError('VALIDATION_ERROR', error.issues[0]?.message ?? 'Invalid request.', 400, {
        requestId,
      });
    }

    if (userId) {
      await logGenerationEvent({
        userId,
        projectId: typeof requestBody?.projectId === 'string' ? requestBody.projectId : undefined,
        featureType: 'TEST_CASE',
        provider:
          typeof requestBody?.provider === 'string' ? (requestBody.provider as never) : undefined,
        inputSnapshot: requestBody ?? {},
        status: 'FAILED',
        errorMessage:
          error instanceof Error ? error.message : 'Unable to generate acceptance criteria.',
      }).catch(() => undefined);
    }

    const message = normalizeGenerationError(error);
    const httpStatus =
      message.toLowerCase().includes('rate or quota') ||
      message.toLowerCase().includes('rate limit') ||
      message.toLowerCase().includes('quota')
        ? 429
        : 400;

    logApiEvent({
      level: 'error',
      requestId,
      route: '/api/acceptance-criteria/generate',
      message: 'Acceptance criteria generation failed',
      details: {
        userId,
        projectId: requestBody?.projectId,
        provider: requestBody?.provider,
        error: serializeError(error),
      },
    });

    return jsonError('ACCEPTANCE_CRITERIA_GENERATION_FAILED', message, httpStatus, { requestId });
  }
}
