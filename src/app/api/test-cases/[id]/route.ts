import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { jsonError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { saveTestCaseBatchRequestSchema } from "@/lib/validators/test-case";
import { getOrCreateDemoUser } from "@/server/services/demo-user";
import { mapTestCaseBatch } from "@/server/services/mappers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getOrCreateDemoUser();

    const batch = await prisma.testCaseBatch.findFirst({
      where: {
        id,
        project: {
          userId: user.id,
        },
      },
      include: {
        testCases: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!batch) {
      return jsonError("TEST_CASE_BATCH_NOT_FOUND", "Saved test case batch was not found.", 404);
    }

    return NextResponse.json(mapTestCaseBatch(batch as never), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load test case batch.";
    return jsonError("TEST_CASE_BATCH_FETCH_FAILED", message, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input = saveTestCaseBatchRequestSchema.parse(body);
    const user = await getOrCreateDemoUser();

    const existing = await prisma.testCaseBatch.findFirst({
      where: {
        id,
        project: {
          userId: user.id,
        },
      },
    });

    if (!existing) {
      return jsonError("TEST_CASE_BATCH_NOT_FOUND", "Saved test case batch was not found.", 404);
    }

    await prisma.testCase.deleteMany({
      where: {
        batchId: id,
      },
    });

    const batch = await prisma.testCaseBatch.update({
      where: { id },
      data: {
        projectId: input.projectId,
        featureTitle: input.featureTitle,
        sourceRequirement: input.sourceRequirement,
        acceptanceCriteria: input.acceptanceCriteria,
        generationMode: input.generationMode,
        status: "SAVED",
        testCases: {
          create: input.cases.map((testCase) => ({
            projectId: input.projectId,
            title: testCase.title,
            preconditions: testCase.preconditions,
            steps: testCase.steps,
            expectedResult: testCase.expectedResult,
            priority: testCase.priority,
            caseType: testCase.caseType,
            tags: testCase.tags,
            status: "SAVED",
          })),
        },
      },
      include: {
        testCases: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    await prisma.project.update({
      where: { id: input.projectId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(mapTestCaseBatch(batch as never), { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("INVALID_JSON", "Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return jsonError("VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request.", 400);
    }

    const message = error instanceof Error ? error.message : "Unable to update test case batch.";
    return jsonError("TEST_CASE_BATCH_UPDATE_FAILED", message, 500);
  }
}
