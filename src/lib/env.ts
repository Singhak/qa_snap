import { z } from 'zod';

import type { AIProvider, AIProviderOption } from '@/types/api';

const serverEnvSchema = z.object({
  AI_PROVIDER_DEFAULT: z.enum(['OPENAI', 'OPENROUTER', 'GEMINI', 'ANTHROPIC']).optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('openai/gpt-4.1-mini'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv() {
  return serverEnvSchema.parse({
    AI_PROVIDER_DEFAULT: process.env.AI_PROVIDER_DEFAULT,
    OPENAI_API_KEY: emptyToUndefined(process.env.OPENAI_API_KEY),
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    OPENROUTER_API_KEY: emptyToUndefined(process.env.OPENROUTER_API_KEY),
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4.1-mini',
    GEMINI_API_KEY: emptyToUndefined(process.env.GEMINI_API_KEY),
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    ANTHROPIC_API_KEY: emptyToUndefined(process.env.ANTHROPIC_API_KEY),
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
  });
}

export function getAvailableAIProviders(env = getServerEnv()): AIProviderOption[] {
  const providers: AIProviderOption[] = [];

  if (env.OPENAI_API_KEY) {
    providers.push({
      id: 'OPENAI',
      label: 'OpenAI',
      model: env.OPENAI_MODEL,
      supportsVision: true,
    });
  }

  if (env.OPENROUTER_API_KEY) {
    providers.push({
      id: 'OPENROUTER',
      label: 'OpenRouter',
      model: env.OPENROUTER_MODEL,
      supportsVision: true,
    });
  }

  if (env.GEMINI_API_KEY) {
    providers.push({
      id: 'GEMINI',
      label: 'Google Gemini',
      model: env.GEMINI_MODEL,
      supportsVision: true,
    });
  }

  if (env.ANTHROPIC_API_KEY) {
    providers.push({
      id: 'ANTHROPIC',
      label: 'Anthropic Claude',
      model: env.ANTHROPIC_MODEL,
      supportsVision: true,
    });
  }

  return providers;
}

export function resolveAIProvider(
  preferredProvider?: AIProvider,
  env = getServerEnv()
): AIProviderOption {
  const providers = getAvailableAIProviders(env);

  if (!providers.length) {
    throw new Error(
      'No AI provider is configured. Add at least one API key for OpenAI, OpenRouter, Gemini, or Anthropic.'
    );
  }

  if (preferredProvider) {
    const explicit = providers.find((provider) => provider.id === preferredProvider);

    if (!explicit) {
      throw new Error(`${preferredProvider} is not configured in the current environment.`);
    }

    return explicit;
  }

  if (env.AI_PROVIDER_DEFAULT) {
    const byDefault = providers.find((provider) => provider.id === env.AI_PROVIDER_DEFAULT);

    if (byDefault) {
      return byDefault;
    }
  }

  return providers[0];
}

export function getProviderApiKey(provider: AIProvider, env = getServerEnv()) {
  switch (provider) {
    case 'OPENAI':
      return env.OPENAI_API_KEY;
    case 'OPENROUTER':
      return env.OPENROUTER_API_KEY;
    case 'GEMINI':
      return env.GEMINI_API_KEY;
    case 'ANTHROPIC':
      return env.ANTHROPIC_API_KEY;
  }
}

function emptyToUndefined(value?: string) {
  return value && value.trim() ? value : undefined;
}

export type { ServerEnv };
