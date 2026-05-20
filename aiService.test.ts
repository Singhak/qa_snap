// e:\01-Bussiness\codex\aiService.test.ts

import { getAvailableAIProviders, generateText, AIProvider } from './aiService';

describe('aiService', () => {
  describe('getAvailableAIProviders', () => {
    it('should return a list of available AI providers', () => {
      const providers = getAvailableAIProviders();
      expect(providers).toEqual(["OpenAI", "OpenRouter", "Gemini", "Anthropic"]);
    });
  });

  describe('generateText', () => {
    it('should generate text for OpenAI provider', async () => {
      const prompt = "Hello world";
      const response = await generateText(prompt, "OpenAI");
      expect(response).toBe(`OpenAI generated response for: "${prompt}"`);
    });

    it('should generate text for OpenRouter provider', async () => {
      const prompt = "Tell me a story";
      const response = await generateText(prompt, "OpenRouter");
      expect(response).toBe(`OpenRouter generated response for: "${prompt}"`);
    });

    it('should generate text for Gemini provider', async () => {
      const prompt = "Write a poem";
      const response = await generateText(prompt, "Gemini");
      expect(response).toBe(`Gemini generated response for: "${prompt}"`);
    });

    it('should reject for an unknown AI provider', async () => {
      const prompt = "Invalid provider test";
      const unknownProvider = "UnknownAI" as AIProvider; // Cast to bypass type checking for test
      await expect(generateText(prompt, unknownProvider)).rejects.toThrow('Unknown AI provider: UnknownAI');
    });
  });
});