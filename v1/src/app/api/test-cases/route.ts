import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { jsonError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { saveTestCaseBatchRequestSchema } from '@/lib/validators/test-case';
import { getOrCreateDemoUser } from '@/server/services/demo-user';
import { mapTestCaseBatch } from '@/server/services/mappers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = saveTestCaseBatchRequestSchema.parse(body);
    const user = await getOrCreateDemoUser();

    const project = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', 'Create or select a project before saving.', 404);
    }

    const batch = await prisma.testCaseBatch.create({
      data: {
        projectId: project.id,
        createdById: user.id,
        featureTitle: input.featureTitle,
        sourceRequirement: input.sourceRequirement,
        acceptanceCriteria: input.acceptanceCriteria,
        generationMode: input.generationMode,
        status: 'SAVED',
        testCases: {
          create: input.cases.map((testCase) => ({
            projectId: project.id,
            title: testCase.title,
            preconditions: testCase.preconditions,
            steps: testCase.steps,
            expectedResult: testCase.expectedResult,
            priority: testCase.priority,
            caseType: testCase.caseType,
            tags: testCase.tags,
            status: 'SAVED',
          })),
        },
      },
      include: {
        testCases: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    await prisma.project.update({
      where: {
        id: project.id,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(mapTestCaseBatch(batch as never), { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
    }

    if (error instanceof ZodError) {
      return jsonError('VALIDATION_ERROR', error.issues[0]?.message ?? 'Invalid request.', 400);
    }

    const message = error instanceof Error ? error.message : 'Unable to save test case batch.';
    return jsonError('TEST_CASE_BATCH_SAVE_FAILED', message, 500);
  }
}
