import { zodTextFormat } from 'openai/helpers/zod';
import { z, ZodTypeAny } from 'zod';

import { getServerEnv } from '@/lib/env';
import { getOpenAIClient } from '@/lib/openai';

export async function generateStructuredOutput<TSchema extends ZodTypeAny>({
  schema,
  schemaName,
  instructions,
  prompt,
  maxOutputTokens,
}: {
  schema: TSchema;
  schemaName: string;
  instructions: string;
  prompt: string;
  maxOutputTokens: number;
}): Promise<z.output<TSchema>> {
  const openai = getOpenAIClient();
  const env = getServerEnv();

  const response = await openai.responses.parse({
    model: env.OPENAI_MODEL,
    instructions,
    input: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_output_tokens: maxOutputTokens,
    text: {
      format: zodTextFormat(schema, schemaName),
    },
  });

  if (response.output_parsed) {
    return schema.parse(response.output_parsed);
  }

  const refusal = response.output
    .flatMap((item) => ('content' in item && Array.isArray(item.content) ? item.content : []))
    .find((content) => content.type === 'refusal');

  if (refusal && 'refusal' in refusal) {
    throw new Error(refusal.refusal);
  }

  throw new Error('The model did not return structured output.');
}
