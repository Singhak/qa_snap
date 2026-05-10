import { NextResponse } from 'next/server';

import { getAvailableAIProviders } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { createRequestId, logApiEvent, serializeError } from '@/server/monitoring';

export async function GET() {
  const requestId = createRequestId();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'ok',
        requestId,
        timestamp: new Date().toISOString(),
        database: 'reachable',
        aiProviders: getAvailableAIProviders().map((provider) => ({
          id: provider.id,
          model: provider.model,
          supportsVision: provider.supportsVision,
        })),
      },
      {
        status: 200,
        headers: {
          'x-request-id': requestId,
        },
      }
    );
  } catch (error) {
    logApiEvent({
      level: 'error',
      requestId,
      route: '/api/health',
      message: 'Health check failed',
      details: {
        error: serializeError(error),
      },
    });

    return NextResponse.json(
      {
        status: 'error',
        requestId,
        timestamp: new Date().toISOString(),
        database: 'unreachable',
      },
      {
        status: 500,
        headers: {
          'x-request-id': requestId,
        },
      }
    );
  }
}
