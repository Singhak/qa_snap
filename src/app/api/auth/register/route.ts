import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ZodError, z } from "zod";

import { jsonError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: {
        email: input.email.toLowerCase(),
      },
    });

    if (existingUser) {
      return jsonError("EMAIL_IN_USE", "An account with that email already exists.", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
      },
    });

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("INVALID_JSON", "Request body must be valid JSON.", 400);
    }

    if (error instanceof ZodError) {
      return jsonError("VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request.", 400);
    }

    const message = error instanceof Error ? error.message : "Unable to register user.";
    return jsonError("REGISTER_FAILED", message, 500);
  }
}
