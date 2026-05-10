import { prisma } from '@/lib/prisma';
import { getServerEnv, resolveAIProvider } from '@/lib/env';
import type { AIProvider } from '@/types/api';
import type { GenerationFeatureType, GenerationStatus } from '@prisma/client';

export async function logGenerationEvent(args: {
  userId: string;
  projectId?: string;
  featureType: GenerationFeatureType;
  provider?: AIProvider;
  inputSnapshot: unknown;
  outputSnapshot?: unknown;
  status: GenerationStatus;
  errorMessage?: string;
}) {
  const env = getServerEnv();
  const resolvedProvider = safelyResolveProvider(args.provider);

  await prisma.generationLog.create({
    data: {
      userId: args.userId,
      projectId: args.projectId,
      featureType: args.featureType,
      model: resolvedProvider ? `${resolvedProvider.id}:${resolvedProvider.model}` : 'UNRESOLVED',
      inputSnapshot: args.inputSnapshot as never,
      outputSnapshot: args.outputSnapshot as never,
      status: args.status,
      errorMessage: args.errorMessage,
    },
  });

  if (args.status === 'SUCCESS') {
    await prisma.usageEvent.create({
      data: {
        userId: args.userId,
        featureType: args.featureType,
        creditsUsed: 1,
      },
    });
  }

  function safelyResolveProvider(provider?: AIProvider) {
    try {
      return resolveAIProvider(provider, env);
    } catch {
      return null;
    }
  }
}

export function normalizeGenerationError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to generate output.';
  const lower = message.toLowerCase();

  if (lower.includes('not configured')) {
    return 'The selected AI provider is not configured. Add its API key in .env.local or switch providers.';
  }

  if (lower.includes('rate limit') || lower.includes('quota')) {
    return 'The selected AI provider hit a rate or quota limit. Try again or switch to another provider.';
  }

  if (lower.includes('timeout')) {
    return 'The AI provider timed out while generating output. Please retry.';
  }

  if (
    lower.includes('empty response') ||
    lower.includes('valid json') ||
    lower.includes('structured output')
  ) {
    return 'The AI provider returned an unreadable response. Please retry or choose a different provider.';
  }

  return message;
}
