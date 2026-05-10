import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

import { jsonError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { saveTestCaseBatchRequestSchema } from '@/lib/validators/test-case';
import { getCurrentUser } from '@/server/auth/current-user';
import { mapTestCaseBatch } from '@/server/services/mappers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = saveTestCaseBatchRequestSchema.parse(body);
    const user = await getCurrentUser();

    if (!user) {
      return jsonError('UNAUTHORIZED', 'You must sign in to save test case batches.', 401);
    }

    const project = await prisma.project.findFirst({
      where: {
        id: input.projectId,
        userId: user.id,
      },
    });

    if (!project) {
      return jsonError('PROJECT_NOT_FOUND', 'Create or select a project before saving.', 404);
    }

    const createData: Prisma.TestCaseBatchCreateInput = {
      project: {
        connect: {
          id: project.id,
        },
      },
      createdBy: {
        connect: {
          id: user.id,
        },
      },
      featureTitle: input.featureTitle,
      sourceRequirement: input.sourceRequirement,
      acceptanceCriteria: input.acceptanceCriteria,
      contextNotes: input.contextNotes,
      sourceMaterials: input.attachments
        ? (input.attachments as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      provider: input.provider,
      generationMode: input.generationMode,
      status: 'SAVED',
      testCases: {
        create: input.cases.map((testCase) => ({
          project: {
            connect: {
              id: project.id,
            },
          },
          title: testCase.title,
          preconditions: testCase.preconditions as Prisma.InputJsonValue,
          steps: testCase.steps as Prisma.InputJsonValue,
          expectedResult: testCase.expectedResult,
          priority: testCase.priority,
          caseType: testCase.caseType,
          tags: testCase.tags ? (testCase.tags as Prisma.InputJsonValue) : Prisma.JsonNull,
          status: 'SAVED',
        })),
      },
    };

    const batch = await prisma.testCaseBatch.create({
      data: createData,
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

    return NextResponse.json(mapTestCaseBatch(batch), { status: 201 });
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
