# AI Prompt Engineering Approach

QA Copilot builds prompts around a narrow QA role: convert messy tester context into structured, editable QA assets without inventing project facts.

## Current Principles

- Prompts instruct the model to act as a senior QA analyst or QA test designer.
- API routes validate and sanitize user input before prompt construction.
- Outputs are parsed through structured Zod schemas instead of free-form text.
- Provider-specific transport lives in `src/server/services/structured-output.ts`; task prompts stay in `src/server/prompts`.
- The app supports OpenAI, OpenRouter, Gemini, and Anthropic through one generation interface.

## Current Prompt Locations

- Bug report prompt: `src/server/prompts/bug-report.ts`
- Test-case prompt: `src/server/prompts/test-case.ts`
- QA intelligence analysis: `src/server/services/qa-intelligence.ts`

## Guardrails

- Do not invent missing facts.
- Keep uncertain details in assumptions or recommendations.
- Return schema-valid structured JSON.
- Use uploaded source material only as context, not as executable content.
- Leave final editing and save decisions to the user.

## Future Work

- Add prompt version IDs to persisted generation logs.
- Add A/B prompt evaluation.
- Add regression fixtures for known prompt-quality cases.
