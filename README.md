# QA Copilot

QA Copilot is a Next.js SaaS prototype for QA teams. It helps testers generate:

- structured bug reports
- manual test cases
- exportable QA artifacts from requirements, notes, and design inputs

It includes:

- Next.js App Router
- Prisma + PostgreSQL
- Auth.js email login and optional Google SSO
- multiple AI providers: OpenAI, OpenRouter, Gemini, Anthropic
- project history, exports, and saved QA records

## Environment

Copy `.env.example` into `.env.local` for local development.

Required:

- `DATABASE_URL`
- `AUTH_SECRET`

Optional AI providers:

- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`

Optional auth:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Optional security:

- `APP_ALLOWED_ORIGINS` comma-separated CORS allowlist, for example `http://localhost:3000`

Notes:

- At least one AI provider key must be configured for generation to work.
- `AUTH_SECRET` is required. Auth.js will fail without it.

## Local setup

1. Install dependencies
   `cmd /c npm install`
2. Generate Prisma client
   `cmd /c npm run prisma:generate`
3. Apply local migrations
   `cmd /c npm run prisma:migrate`
4. Start development server
   `cmd /c npm run dev`

Open:

- `http://localhost:3000/sign-in`
- `http://localhost:3000/dashboard`

## Prisma migration cleanup

If Prisma generation fails on Windows with a DLL rename or `EPERM` error:

1. Stop the running Next.js dev server
2. Retry:
   `cmd /c npm run prisma:generate`
3. If schema changed, then run:
   `cmd /c npm run prisma:migrate`
4. Restart dev:
   `cmd /c npm run dev`

Why this happens:

- Prisma’s Windows query engine DLL can be locked by a running local process.

Recommended workflow after schema changes:

1. stop dev server
2. run `prisma generate`
3. run `prisma migrate`
4. start dev server again

## Monitoring and error tracking

Current built-in monitoring:

- request IDs on important API errors
- structured server log lines for generation failures
- generation audit logs stored in Prisma
- usage events for quota tracking
- health endpoint at `GET /api/health`
- middleware security headers and API mutation rate limiting

Useful runtime checks:

- `GET /api/health`
- check server logs for `requestId`
- inspect Prisma `GenerationLog` and `UsageEvent` tables

Current monitoring scope is lightweight and app-native. For production, add:

- Sentry
- uptime monitoring
- hosted log aggregation
- alerting on health endpoint failures

## Documentation

- AI prompt approach: `docs/ai-prompt-engineering.md`
- API versioning strategy: `docs/api-versioning-strategy.md`
- Security and monitoring baseline: `docs/security-and-monitoring.md`
- OpenAPI draft: `openapi.yaml`

## Main routes

App pages:

- `/dashboard`
- `/projects`
- `/bug-reports`
- `/test-cases`
- `/settings`

Key APIs:

- `POST /api/bug-reports/generate`
- `POST /api/test-cases/generate`
- `GET /api/health`
- `GET /api/ai/providers`

## Current status

This repo is in strong prototype / private beta shape, not fully public-launch hardened yet.

Still recommended before broad launch:

- forgot-password flow
- automated integration tests
- hosted monitoring and alerts
- billing and plan enforcement
- continued refactor of large shared workspace state
