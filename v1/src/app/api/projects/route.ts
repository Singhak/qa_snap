import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { jsonError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { createProjectRequestSchema } from '@/lib/validators/project';
import { getOrCreateDemoUser } from '@/server/services/demo-user';
import { mapProject } from '@/server/services/mappers';

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();
    const projects = await prisma.project.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(projects.map(mapProject), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load projects.';
    return jsonError('PROJECTS_FETCH_FAILED', message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createProjectRequestSchema.parse(body);
    const user = await getOrCreateDemoUser();

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: input.name,
        description: input.description,
      },
    });

    return NextResponse.json(mapProject(project), { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
    }

    if (error instanceof ZodError) {
      return jsonError('VALIDATION_ERROR', error.issues[0]?.message ?? 'Invalid request.', 400);
    }

    const message = error instanceof Error ? error.message : 'Unable to create project.';
    return jsonError('PROJECT_CREATE_FAILED', message, 500);
  }
}
