'use client';

import Link from 'next/link';
import { useEffect } from 'react';

type ErrorBoundaryFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  homeHref?: string;
};

export function ErrorBoundaryFallback({
  error,
  reset,
  title = 'Something went wrong',
  homeHref = '/',
}: ErrorBoundaryFallbackProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="error-boundary-shell">
      <section className="error-boundary-panel">
        <p className="eyebrow">Recovery</p>
        <h1>{title}</h1>
        <p className="panel-lead">
          The page hit an unexpected problem. You can retry the view, or return to a stable page
          while the details are logged locally.
        </p>
        {error.digest ? <p className="meta">Reference: {error.digest}</p> : null}
        <div className="button-row">
          <button className="button" type="button" onClick={reset}>
            Try Again
          </button>
          <Link className="button secondary" href={homeHref}>
            Go Back
          </Link>
        </div>
      </section>
    </div>
  );
}
