import { type NextRequest, NextResponse } from 'next/server';

import { jsonError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/server/auth/current-user';
import { mapQaIntelligenceRun, qaIntelligenceRuns } from '@/server/services/qa-intelligence-runs';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return jsonError('UNAUTHORIZED', 'You must sign in to view intelligence runs.', 401);
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', 'Project was not found.', 404);
    }

    const runs = await qaIntelligenceRuns().findMany({
      where: {
        projectId: project.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return NextResponse.json(runs.map(mapQaIntelligenceRun), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load intelligence runs.';
    return jsonError('QA_INTELLIGENCE_FETCH_FAILED', message, 500);
  }
}
