import type { ApiErrorResponse } from '@/types/api';

export function getApiErrorMessage(payload: unknown, fallbackMessage: string) {
  const data = payload as ApiErrorResponse | undefined;
  const message = data?.error?.message ?? fallbackMessage;
  const requestId = data?.error?.requestId;

  return requestId ? `${message} Reference: ${requestId}` : message;
}

export async function fetchJson<TResponse>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, 'Request failed.'));
  }

  return data as TResponse;
}
