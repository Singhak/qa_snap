# QA Copilot

Minimal Next.js starter for an AI-powered QA SaaS that generates:

- structured bug reports
- structured manual test cases

It uses:

- Next.js App Router
- Prisma
- Zod
- OpenAI Responses API with structured outputs

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- optional `OPENAI_MODEL`

Default model: `gpt-4.1-mini`

## Local setup

1. Install dependencies
   `npm install`
2. Generate Prisma client
   `npm run prisma:generate`
3. Run migrations
   `npm run prisma:migrate`
4. Start the app
   `npm run dev`

## API endpoints

- `POST /api/bug-reports/generate`
- `POST /api/test-cases/generate`

## Notes

- The current UI is a simple playground page at `/`.
- The OpenAI integration uses structured parsing against Zod schemas.
- Database persistence routes are not wired yet, but the Prisma schema and client helper are included.
