import { type NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

import { jsonError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { fetchJiraIssue } from '@/lib/api/integrations/jira';
import { getCurrentUser } from '@/server/auth/current-user';
import { createRequestId, logApiEvent, serializeError } from '@/server/monitoring';

const fetchJiraStoryRequestSchema = z.object({
  projectId: z.string().uuid(),
  issueKey: z.string().trim().min(1).max(50),
});

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  let userId: string | null = null;
  let requestBody: Record<string, unknown> | null = null;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError('UNAUTHORIZED', 'You must sign in to fetch Jira stories.', 401, {
        requestId,
      });
    }

    userId = user.id;

    requestBody = await request.json();
    const { projectId, issueKey } = fetchJiraStoryRequestSchema.parse(requestBody);

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', 'Project was not found or access was denied.', 404, {
        requestId,
      });
    }

    const { jiraDomain, jiraEmail, jiraToken } = project;

    if (!jiraDomain || !jiraToken) {
      return jsonError(
        'INTEGRATION_NOT_CONFIGURED',
        'Jira integration is not configured. Please add your Jira domain and token in Project settings.',
        400,
        { requestId }
      );
    }

    const jiraIssue = await fetchJiraIssue({
      domain: jiraDomain,
      email: jiraEmail,
      token: jiraToken,
      issueKey,
    });

    logApiEvent({
      level: 'info',
      requestId,
      route: '/api/acceptance-criteria/jira-story',
      message: 'Successfully fetched Jira story for preview',
      details: {
        userId,
        projectId,
        jiraIssueKey: jiraIssue.key,
      },
    });

    return NextResponse.json(jiraIssue, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400, { requestId });
    }

    if (error instanceof ZodError) {
      return jsonError('VALIDATION_ERROR', error.issues[0]?.message ?? 'Invalid request.', 400, {
        requestId,
      });
    }

    logApiEvent({
      level: 'error',
      requestId,
      route: '/api/acceptance-criteria/jira-story',
      message: 'Failed to fetch Jira story description',
      details: {
        userId,
        projectId: requestBody?.projectId,
        error: serializeError(error),
      },
    });

    const message = error instanceof Error ? error.message : 'Unable to fetch Jira story.';
    return jsonError('JIRA_FETCH_FAILED', message, 500, { requestId });
  }
}
