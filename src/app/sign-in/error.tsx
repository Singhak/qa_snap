'use client';

import { ErrorBoundaryFallback } from '@/components/error-boundary-fallback';

export default function SignInError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundaryFallback
      error={error}
      reset={reset}
      title="Sign in could not load"
      homeHref="/"
    />
  );
}
