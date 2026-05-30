import { NextRequest, NextResponse } from 'next/server';

import { jsonError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { exportBugReportToGitHub } from '@/lib/api/integrations/github';
import { getCurrentUser } from '@/server/auth/current-user';
import { createRequestId, logApiEvent, serializeError } from '@/server/monitoring';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const { id } = await params;
  let userId: string | null = null;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError('UNAUTHORIZED', 'You must sign in to export bug reports.', 401, {
        requestId,
      });
    }

    userId = user.id;

    // Fetch the bug report and include its project integrations
    const bugReport = await prisma.bugReport.findFirst({
      where: {
        id,
        project: {
          userId: user.id,
        },
      },
      include: {
        project: true,
      },
    });

    if (!bugReport) {
      return jsonError('BUG_REPORT_NOT_FOUND', 'Bug report was not found.', 404, { requestId });
    }

    const { githubToken, githubRepo } = bugReport.project;

    if (!githubToken || !githubRepo) {
      return jsonError(
        'INTEGRATION_NOT_CONFIGURED',
        'GitHub integration is not configured. Please go to Project settings and add your repo and token.',
        400,
        { requestId }
      );
    }

    const issue = await exportBugReportToGitHub({
      repo: githubRepo,
      token: githubToken,
      bugReport: bugReport as never,
    });

    logApiEvent({
      level: 'info',
      requestId,
      route: `/api/bug-reports/${id}/export/github`,
      message: 'Bug report successfully exported to GitHub',
      details: {
        userId,
        projectId: bugReport.projectId,
        bugReportId: bugReport.id,
        githubIssueUrl: issue.html_url,
      },
    });

    return NextResponse.json({ url: issue.html_url }, { status: 200 });
  } catch (error) {
    logApiEvent({
      level: 'error',
      requestId,
      route: `/api/bug-reports/${id}/export/github`,
      message: 'Failed to export bug report to GitHub',
      details: {
        userId,
        error: serializeError(error),
      },
    });

    const message = error instanceof Error ? error.message : 'Unable to export bug report to GitHub.';
    return jsonError('GITHUB_EXPORT_FAILED', message, 500, { requestId });
  }
}
