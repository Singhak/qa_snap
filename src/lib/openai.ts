import OpenAI from 'openai';

import { getProviderApiKey } from '@/lib/env';
import type { AIProvider } from '@/types/api';

const clients = new Map<string, OpenAI>();

export function getOpenAIClient(provider: Extract<AIProvider, 'OPENAI' | 'OPENROUTER'> = 'OPENAI') {
  if (clients.has(provider)) {
    return clients.get(provider)!;
  }

  const apiKey = getProviderApiKey(provider);

  if (!apiKey) {
    throw new Error(`${provider} is not configured in the current environment.`);
  }

  const client = new OpenAI({
    apiKey,
    baseURL: provider === 'OPENROUTER' ? 'https://openrouter.ai/api/v1' : undefined,
  });

  clients.set(provider, client);
  return client;
}
