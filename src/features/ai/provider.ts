import type { AIProvider } from "./types";
import { XAIProvider } from "./xai";

export type AIProviderName = "xai";

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider | null {
  if (cachedProvider) return cachedProvider;

  const providerName = (process.env.AI_PROVIDER ?? "xai") as AIProviderName;

  switch (providerName) {
    case "xai": {
      const apiKey = process.env.AI_API_KEY;
      if (!apiKey) return null;
      cachedProvider = new XAIProvider(apiKey);
      return cachedProvider;
    }
    default:
      return null;
  }
}
