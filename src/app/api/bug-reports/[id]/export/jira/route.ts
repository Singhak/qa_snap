import { NextRequest, NextResponse } from 'next/server';

import { jsonError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { exportBugReportToJira } from '@/lib/api/integrations/jira';
import { getCurrentUser } from '@/server/auth/current-user';
import { createRequestId, logApiEvent, serializeError } from '@/server/monitoring';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { jiraDomain, jiraEmail, jiraToken, jiraProjectKey } = bugReport.project;

    if (!jiraDomain || !jiraToken || !jiraProjectKey) {
      return jsonError(
        'INTEGRATION_NOT_CONFIGURED',
        'Jira integration is missing required fields. Please go to Project settings and add your domain, token, and project key.',
        400,
        { requestId }
      );
    }

    const issue = await exportBugReportToJira({
      domain: jiraDomain,
      email: jiraEmail,
      token: jiraToken,
      projectKey: jiraProjectKey,
      bugReport: bugReport as never,
    });

    logApiEvent({
      level: 'info',
      requestId,
      route: `/api/bug-reports/${id}/export/jira`,
      message: 'Bug report successfully exported to Jira',
      details: {
        userId,
        projectId: bugReport.projectId,
        bugReportId: bugReport.id,
        jiraIssueKey: issue.key,
        jiraIssueUrl: issue.self,
      },
    });

    return NextResponse.json({ url: issue.self }, { status: 200 });
  } catch (error) {
    logApiEvent({
      level: 'error',
      requestId,
      route: `/api/bug-reports/${id}/export/jira`,
      message: 'Failed to export bug report to Jira',
      details: {
        userId,
        error: serializeError(error),
      },
    });

    const message = error instanceof Error ? error.message : 'Unable to export bug report to Jira.';
    return jsonError('JIRA_EXPORT_FAILED', message, 500, { requestId });
  }
}
