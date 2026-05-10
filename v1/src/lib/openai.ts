import OpenAI from 'openai';

import { getServerEnv } from '@/lib/env';

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (client) {
    return client;
  }

  const env = getServerEnv();
  client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });

  return client;
}
