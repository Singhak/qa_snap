import { NextResponse } from "next/server";

import { getAvailableAIProviders } from "@/lib/env";
import { getCurrentUser } from "@/server/auth/current-user";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(getAvailableAIProviders(), { status: 200 });
}
