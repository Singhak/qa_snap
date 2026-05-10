import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { ZodError, z } from 'zod';

import { jsonError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { aiProviderSchema } from '@/lib/validators/ai';
import { getCurrentUser } from '@/server/auth/current-user';
import { mapUserSettings } from '@/server/services/mappers';

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  preferredProvider: aiProviderSchema.or(z.literal('')).optional(),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError('UNAUTHORIZED', 'You must sign in to view settings.', 401);
  }

  return NextResponse.json(mapUserSettings(user), { status: 200 });
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return jsonError('UNAUTHORIZED', 'You must sign in to update settings.', 401);
    }

    const body = await request.json();
    const input = updateProfileSchema.parse(body);
    const updateData: Prisma.UserUpdateInput = {
      name: input.name ?? user.name ?? undefined,
    };

    if ('preferredProvider' in input) {
      updateData.preferredProvider = input.preferredProvider || null;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: updateData,
    });

    return NextResponse.json(mapUserSettings(updatedUser), { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError('INVALID_JSON', 'Request body must be valid JSON.', 400);
    }

    if (error instanceof ZodError) {
      return jsonError('VALIDATION_ERROR', error.issues[0]?.message ?? 'Invalid request.', 400);
    }

    const message = error instanceof Error ? error.message : 'Unable to update settings.';
    return jsonError('SETTINGS_UPDATE_FAILED', message, 500);
  }
}
