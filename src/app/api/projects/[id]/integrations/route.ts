import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { jsonError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { projectIntegrationsSchema } from '@/lib/validators/project-integrations';
import { getCurrentUser } from '@/server/auth/current-user';

function maskSecret(val?: string | null): string | null {
  if (!val || val.trim().length === 0) return null;
  if (val.startsWith('ghp_')) {
    return 'ghp_••••••••••••••••••••';
  }
  return '••••••••••••••••';
}

function isMasked(val?: string | null): boolean {
  if (!val) return false;
  return val.includes('••') || val.includes('••••');
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return jsonError('UNAUTHORIZED', 'You must sign in to view integrations.', 401);
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        githubToken: true,
        githubRepo: true,
        jiraDomain: true,
        jiraEmail: true,
        jiraToken: true,
        jiraProjectKey: true,
      },
    });

    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', 'Project was not found.', 404);
    }

    return NextResponse.json(
      {
        githubRepo: project.githubRepo ?? '',
        jiraDomain: project.jiraDomain ?? '',
        jiraEmail: project.jiraEmail ?? '',
        jiraProjectKey: project.jiraProjectKey ?? '',
        githubToken: project.githubToken ? maskSecret(project.githubToken) : '',
        jiraToken: project.jiraToken ? maskSecret(project.jiraToken) : '',
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load project integrations.';
    return jsonError('INTEGRATIONS_FETCH_FAILED', message, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return jsonError('UNAUTHORIZED', 'You must sign in to update integrations.', 401);
    }

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', 'Project was not found.', 404);
    }

    const body = await request.json();
    const input = projectIntegrationsSchema.parse(body);

    const updateData: Record<string, unknown> = {
      githubRepo: input.githubRepo || null,
      jiraDomain: input.jiraDomain || null,
      jiraEmail: input.jiraEmail || null,
      jiraProjectKey: input.jiraProjectKey || null,
    };

    // Only update tokens if they are not masked (meaning the user entered a fresh token)
    if (input.githubToken !== undefined) {
      if (input.githubToken === null || input.githubToken.trim() === '') {
        updateData.githubToken = null;
      } else if (!isMasked(input.githubToken)) {
        updateData.githubToken = input.githubToken;
      }
    }

    if (input.jiraToken !== undefined) {
      if (input.jiraToken === null || input.jiraToken.trim() === '') {
        updateData.jiraToken = null;
      } else if (!isMasked(input.jiraToken)) {
        updateData.jiraToken = input.jiraToken;
      }
    }

    await prisma.project.update({
      where: {
        id,
      },
      data: updateData,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
    }

    if (error instanceof ZodError) {
      return jsonError('VALIDATION_ERROR', error.issues[0]?.message ?? 'Invalid request.', 400);
    }

    const message = error instanceof Error ? error.message : 'Unable to update integrations.';
    return jsonError('INTEGRATIONS_UPDATE_FAILED', message, 500);
  }
}
