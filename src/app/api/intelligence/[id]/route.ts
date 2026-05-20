import { type NextRequest, NextResponse } from 'next/server';

import { jsonError } from '@/lib/api/errors';
import { getCurrentUser } from '@/server/auth/current-user';
import { mapQaIntelligenceRun, qaIntelligenceRuns } from '@/server/services/qa-intelligence-runs';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return jsonError('UNAUTHORIZED', 'You must sign in to view intelligence runs.', 401);
    }

    const run = await qaIntelligenceRuns().findFirst({
      where: {
        id,
        project: {
          userId: user.id,
        },
      },
    });

    if (!run) {
      return jsonError('QA_INTELLIGENCE_NOT_FOUND', 'Intelligence run was not found.', 404);
    }

    return NextResponse.json(mapQaIntelligenceRun(run), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load intelligence run.';
    return jsonError('QA_INTELLIGENCE_FETCH_FAILED', message, 500);
  }
}
