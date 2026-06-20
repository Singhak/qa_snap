# Security And Monitoring Baseline

This document captures the current production-hardening baseline and the remaining launch work.

## Implemented

- Required `AUTH_SECRET` for Auth.js.
- Zod validation at API boundaries.
- Shared user-content sanitization for core project, auth/profile, bug report, test-case, and integration inputs.
- CSV formula-injection protection for downloaded QA artifacts.
- Middleware-level security headers.
- Middleware-level CORS allowlist via `APP_ALLOWED_ORIGINS`.
- Middleware-level rate limiting for mutating API requests.
- Route-level quota/rate-limit checks for expensive AI generation and QA intelligence.
- Request IDs and structured server logs for important API failures.
- Health endpoint at `GET /api/health`.

## Remaining

- Add hosted error tracking such as Sentry.
- Add uptime monitoring and alerting.
- Add distributed tracing if API traffic grows.
- Add account lockout and password reset.
- Add audit logs for compliance-sensitive actions.
