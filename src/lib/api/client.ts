import type { ApiErrorResponse } from "@/types/api";

export function getApiErrorMessage(
  payload: unknown,
  fallbackMessage: string,
) {
  const data = payload as ApiErrorResponse | undefined;
  const message = data?.error?.message ?? fallbackMessage;
  const requestId = data?.error?.requestId;

  return requestId ? `${message} Reference: ${requestId}` : message;
}
