import { zodTextFormat } from 'openai/helpers/zod';
import { z, ZodTypeAny } from 'zod';

import { getProviderApiKey, getServerEnv, resolveAIProvider } from '@/lib/env';
import { getOpenAIClient } from '@/lib/openai';
import type { AIProvider } from '@/types/api';

export type StructuredInputContent =
  | {
      type: 'input_text';
      text: string;
    }
  | {
      type: 'input_image';
      image_url: string;
      detail: 'low' | 'high' | 'auto';
    };

export async function generateStructuredOutput<TSchema extends ZodTypeAny>({
  schema,
  schemaName,
  instructions,
  prompt,
  provider,
  inputContent,
  maxOutputTokens,
}: {
  schema: TSchema;
  schemaName: string;
  instructions: string;
  prompt: string;
  provider?: AIProvider;
  inputContent?: StructuredInputContent[];
  maxOutputTokens: number;
}): Promise<z.output<TSchema>> {
  const env = getServerEnv();
  const activeProvider = resolveAIProvider(provider, env);

  switch (activeProvider.id) {
    case 'OPENAI':
      return generateWithOpenAI({
        schema,
        schemaName,
        instructions,
        prompt,
        inputContent,
        maxOutputTokens,
      });
    case 'OPENROUTER':
      return generateWithOpenRouter({
        schema,
        instructions,
        prompt,
        inputContent,
        maxOutputTokens,
        model: activeProvider.model,
        apiKey: requireApiKey('OPENROUTER'),
      });
    case 'GEMINI':
      return generateWithGemini({
        schema,
        instructions,
        prompt,
        inputContent,
        maxOutputTokens,
        model: activeProvider.model,
        apiKey: requireApiKey('GEMINI'),
      });
    case 'ANTHROPIC':
      return generateWithAnthropic({
        schema,
        instructions,
        prompt,
        inputContent,
        maxOutputTokens,
        model: activeProvider.model,
        apiKey: requireApiKey('ANTHROPIC'),
      });
  }
}

async function generateWithOpenAI<TSchema extends ZodTypeAny>({
  schema,
  schemaName,
  instructions,
  prompt,
  inputContent,
  maxOutputTokens,
}: {
  schema: TSchema;
  schemaName: string;
  instructions: string;
  prompt: string;
  inputContent?: StructuredInputContent[];
  maxOutputTokens: number;
}) {
  const openai = getOpenAIClient('OPENAI');
  const env = getServerEnv();

  const response = await openai.responses.parse({
    model: env.OPENAI_MODEL,
    instructions,
    input: [
      {
        role: 'user',
        content: inputContent ?? [{ type: 'input_text', text: prompt }],
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

async function generateWithOpenRouter<TSchema extends ZodTypeAny>({
  schema,
  instructions,
  prompt,
  inputContent,
  maxOutputTokens,
  model,
  apiKey,
}: {
  schema: TSchema;
  instructions: string;
  prompt: string;
  inputContent?: StructuredInputContent[];
  maxOutputTokens: number;
  model: string;
  apiKey: string;
}) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: buildJsonModeInstructions(instructions),
        },
        {
          role: 'user',
          content: mapOpenAICompatibleContent(
            inputContent ?? [{ type: 'input_text', text: prompt }]
          ),
        },
      ],
      max_tokens: maxOutputTokens,
      response_format: {
        type: 'json_object',
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'OpenRouter request failed.');
  }

  const text = data?.choices?.[0]?.message?.content;
  return schema.parse(extractJsonPayload(text));
}

async function generateWithGemini<TSchema extends ZodTypeAny>({
  schema,
  instructions,
  prompt,
  inputContent,
  maxOutputTokens,
  model,
  apiKey,
}: {
  schema: TSchema;
  instructions: string;
  prompt: string;
  inputContent?: StructuredInputContent[];
  maxOutputTokens: number;
  model: string;
  apiKey: string;
}) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildJsonModeInstructions(instructions) }],
        },
        contents: [
          {
            role: 'user',
            parts: mapGeminiParts(inputContent ?? [{ type: 'input_text', text: prompt }]),
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens,
        },
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Gemini request failed.');
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.filter((part: { text?: string }) => typeof part.text === 'string')
    .map((part: { text: string }) => part.text)
    .join('\n');

  return schema.parse(extractJsonPayload(text));
}

async function generateWithAnthropic<TSchema extends ZodTypeAny>({
  schema,
  instructions,
  prompt,
  inputContent,
  maxOutputTokens,
  model,
  apiKey,
}: {
  schema: TSchema;
  instructions: string;
  prompt: string;
  inputContent?: StructuredInputContent[];
  maxOutputTokens: number;
  model: string;
  apiKey: string;
}) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxOutputTokens,
      system: buildJsonModeInstructions(instructions),
      messages: [
        {
          role: 'user',
          content: mapAnthropicContent(inputContent ?? [{ type: 'input_text', text: prompt }]),
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Anthropic request failed.');
  }

  const text = data?.content
    ?.filter((item: { type?: string; text?: string }) => item.type === 'text')
    .map((item: { text: string }) => item.text)
    .join('\n');

  return schema.parse(extractJsonPayload(text));
}

function buildJsonModeInstructions(instructions: string) {
  return [
    instructions,
    'Return JSON only.',
    'Do not wrap the JSON in markdown fences.',
    'Do not include explanations before or after the JSON.',
  ].join('\n');
}

function mapOpenAICompatibleContent(content: StructuredInputContent[]) {
  return content.map((item) => {
    if (item.type === 'input_text') {
      return {
        type: 'text',
        text: item.text,
      };
    }

    return {
      type: 'image_url',
      image_url: {
        url: item.image_url,
        detail: item.detail,
      },
    };
  });
}

function mapGeminiParts(content: StructuredInputContent[]) {
  return content.map((item) => {
    if (item.type === 'input_text') {
      return { text: item.text };
    }

    const parsed = splitDataUrl(item.image_url);

    return {
      inline_data: {
        mime_type: parsed.mimeType,
        data: parsed.base64,
      },
    };
  });
}

function mapAnthropicContent(content: StructuredInputContent[]) {
  return content.map((item) => {
    if (item.type === 'input_text') {
      return {
        type: 'text',
        text: item.text,
      };
    }

    const parsed = splitDataUrl(item.image_url);

    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: parsed.mimeType,
        data: parsed.base64,
      },
    };
  });
}

function splitDataUrl(value: string) {
  const match = value.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error('Image uploads must be valid base64 data URLs.');
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

function extractJsonPayload(value: string | null | undefined) {
  if (!value || !value.trim()) {
    throw new Error('The model returned an empty response.');
  }

  const trimmed = value.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }

    const firstBrace = trimmed.indexOf('{');
    const firstBracket = trimmed.indexOf('[');
    const startCandidates = [firstBrace, firstBracket].filter((index) => index >= 0);
    const start = startCandidates.length ? Math.min(...startCandidates) : -1;
    const lastBrace = trimmed.lastIndexOf('}');
    const lastBracket = trimmed.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);

    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error('The model did not return valid JSON.');
  }
}

function requireApiKey(provider: AIProvider) {
  const apiKey = getProviderApiKey(provider);

  if (!apiKey) {
    throw new Error(`${provider} is not configured in the current environment.`);
  }

  return apiKey;
}
