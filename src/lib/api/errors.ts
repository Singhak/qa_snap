import { NextResponse } from "next/server";

export function jsonError(
  code: string,
  message: string,
  status: number,
  options?: {
    requestId?: string;
  },
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        requestId: options?.requestId,
      },
    },
    {
      status,
      headers: options?.requestId
        ? {
            "x-request-id": options.requestId,
          }
        : undefined,
    },
  );
}
