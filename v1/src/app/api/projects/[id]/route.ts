import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { jsonError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { updateProjectRequestSchema } from '@/lib/validators/project';
import { getOrCreateDemoUser } from '@/server/services/demo-user';
import { mapProjectDetail, mapProject } from '@/server/services/mappers';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getOrCreateDemoUser();

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
          take: 10,
        },
        testCaseBatches: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
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
      return jsonError('PROJECT_NOT_FOUND', 'Project was not found.', 404);
    }

    return NextResponse.json(
      mapProjectDetail({
        project,
        bugReports: project.bugReports as never,
        testCaseBatches: project.testCaseBatches as never,
      }),
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load project.';
    return jsonError('PROJECT_FETCH_FAILED', message, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = updateProjectRequestSchema.parse(body);
    const user = await getOrCreateDemoUser();

    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingProject) {
      return jsonError('PROJECT_NOT_FOUND', 'Project was not found.', 404);
    }

    const project = await prisma.project.update({
      where: {
        id,
      },
      data: {
        name: input.name,
        description: input.description,
      },
    });

    return NextResponse.json(mapProject(project), { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
    }

    if (error instanceof ZodError) {
      return jsonError('VALIDATION_ERROR', error.issues[0]?.message ?? 'Invalid request.', 400);
    }

    const message = error instanceof Error ? error.message : 'Unable to update project.';
    return jsonError('PROJECT_UPDATE_FAILED', message, 500);
  }
}
