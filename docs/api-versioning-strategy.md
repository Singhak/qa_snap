# API Versioning Strategy

QA Copilot currently exposes internal beta API routes under `/api/*`. These routes are stable enough for the app frontend, but not yet a public external API contract.

## Current Approach

- Treat existing `/api/*` routes as beta/internal.
- Preserve backwards-compatible request and response shapes where practical.
- Document breaking changes in release notes before public launch.
- Keep OpenAPI documentation in `openapi.yaml` and update it as routes stabilize.

## Public API Plan

When external integrations become a product requirement, introduce explicit versioned routes:

- `/api/v1/projects`
- `/api/v1/bug-reports`
- `/api/v1/test-cases`
- `/api/v1/intelligence`

## Breaking Change Rules

- Additive response fields are allowed in the same version.
- Removing fields, changing enum values, or changing validation semantics requires a new version.
- Deprecated fields should remain for at least one minor release cycle after public API launch.

## Current Gap

`openapi.yaml` exists but needs a full refresh before external API consumers rely on it.
