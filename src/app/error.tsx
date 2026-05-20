'use client';

import { ErrorBoundaryFallback } from '@/components/error-boundary-fallback';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorBoundaryFallback error={error} reset={reset} title="QA Copilot hit a problem" />;
}
