# TODO — QA Copilot Progress Tracker

Last updated: 2026-06-20

## Completed

### Code Quality & Developer Experience

- [x] ESLint 9 flat config added.
- [x] Prettier config and ignore file added.
- [x] Reliable `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, and test scripts exist.
- [x] `.env.example` documents required and optional local variables.
- [x] Prisma local setup and Windows migration cleanup notes are documented in `README.md`.

### Security Baseline

- [x] `AUTH_SECRET` is required for Auth.js.
- [x] Zod validation exists at API boundaries.
- [x] Shared sanitization exists for user-generated project, profile, bug-report, test-case, attachment, and integration inputs.
- [x] CSV export formula-injection protection exists for downloaded QA artifacts.
- [x] Route-level quota/rate-limit checks exist for expensive AI generation and QA intelligence routes.
- [x] Middleware-level rate limiting exists for mutating API requests.
- [x] Middleware-level CORS allowlist exists via `APP_ALLOWED_ORIGINS`.
- [x] Middleware-level security headers exist.

### Frontend & UX

- [x] React Query/TanStack Query is installed and used for workspace data.
- [x] Lazy workspace page loading/code splitting exists.
- [x] Service worker exists for static public-page caching.
- [x] React error boundaries exist for app, workspace, sign-in, and sign-up surfaces.
- [x] AI service failures degrade into readable UI notices.
- [x] Public landing, pricing, privacy, terms, and contact/support pages exist.

### QA Product Features

- [x] Project CRUD exists.
- [x] Bug report generation, editing, persistence, history detail, search/filtering, and exports exist.
- [x] Test-case generation from text/image source material, editing, persistence, history detail, search/filtering, and exports exist.
- [x] Multiple AI providers are supported: OpenAI, OpenRouter, Gemini, and Anthropic.
- [x] QA Intelligence exists with duplicate detection, coverage gaps, release risk scoring, and severity suggestions.
- [x] QA Intelligence runs are persisted and browsable by project.
- [x] GitHub and Jira export paths exist for saved bug reports.

### Monitoring & Docs

- [x] Request IDs and structured API logs exist for key routes.
- [x] Generation audit logs and usage events are persisted in Prisma.
- [x] Health endpoint exists at `GET /api/health`.
- [x] AI prompt approach is documented in `docs/ai-prompt-engineering.md`.
- [x] API versioning strategy is documented in `docs/api-versioning-strategy.md`.
- [x] Security and monitoring baseline is documented in `docs/security-and-monitoring.md`.
- [x] OpenAPI draft exists in `openapi.yaml`.

### Testing

- [x] Unit test script exists.
- [x] Integration test script exists.
- [x] E2E test script exists.
- [x] Unit coverage exists for QA intelligence and sanitization.

## Partially Done

- [ ] OpenAPI documentation exists but is outdated and should be refreshed against current route schemas.
- [ ] Monitoring is app-native; hosted error tracking, uptime checks, alerts, and tracing are not integrated.
- [ ] Rate limiting is in-memory and suitable for single-instance beta only; production needs Redis or provider-backed shared limits.
- [ ] Service worker caches public static pages only; authenticated workspace offline behavior is not implemented.
- [ ] Search/filtering exists inside project pages but not as a unified global command/search experience.
- [ ] Docs exist, but ADRs for major architecture decisions are still missing.

## Remaining Before Public Launch

### Authentication & Account Security

- [ ] Password reset flow.
- [ ] Failed-login lockout or throttling.
- [ ] Account/session management screen.
- [ ] Optional email verification.

### Production Monitoring

- [ ] Sentry or equivalent error tracking.
- [ ] Hosted log aggregation.
- [ ] Uptime monitoring for `/api/health`.
- [ ] Alerting for AI provider failures, DB failures, and high 429 rates.
- [ ] Performance monitoring for route latency and memory usage.

### Billing & Team Features

- [ ] Stripe subscription management.
- [ ] Plan limits wired to billing tiers.
- [ ] Team management and roles.
- [ ] Project sharing and permissions.
- [ ] Audit logs for compliance-sensitive actions.

### QA Workflow Enhancements

- [ ] Bulk operations for bug reports and test-case batches.
- [ ] TestRail export/integration.
- [ ] Jira/TestRail-style field mapping configuration.
- [ ] Usage analytics dashboard.
- [ ] Prompt versioning and prompt A/B testing.
- [ ] Model selection based on task complexity.

### DevOps & Deployment

- [ ] GitHub Actions CI pipeline.
- [ ] Automated migration safety checks.
- [ ] Dockerfile.
- [ ] Docker Compose for local development.
- [ ] Production database backup and recovery procedure.
- [ ] CDN/cache strategy for static assets.

### Code Organization

- [ ] Continue breaking down large workspace components.
- [ ] Add feature-based component folders.
- [ ] Add ADRs for auth, AI provider abstraction, persistence, and QA intelligence.
- [ ] Add feature flags for gradual rollout.

## Suggested Next Implementation Order

1. Refresh `openapi.yaml` to match current API routes.
2. Add GitHub Actions for lint, typecheck, unit tests, and build.
3. Add password reset and failed-login lockout.
4. Add Sentry or equivalent hosted error tracking.
5. Replace in-memory rate limiting with Redis/shared storage.
6. Add Stripe billing and plan enforcement.
7. Add team roles and audit logs.
