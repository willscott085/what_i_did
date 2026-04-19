import type { AIProvider } from "./types";

export class XAIProvider implements AIProvider {
  private apiKey: string;
  private baseURL = "https://api.x.ai/v1";
  private model = "grok-3-mini-fast";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateTitle(content: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You generate short, meaningful titles for personal notes. Return ONLY the title text, no quotes, no prefix. Keep it under 60 characters. Be concise and descriptive.",
          },
          {
            role: "user",
            content: `Generate a title for this note:\n\n${content.slice(0, 1000)}`,
          },
        ],
        max_tokens: 50,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `xAI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    return data.choices[0]?.message?.content?.trim() ?? "Untitled";
  }

  async generateKeywords(content: string): Promise<string[]> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You extract search keywords from personal notes. Return 5-10 keywords as a JSON array of strings. Include: key topics, synonyms, related concepts, people mentioned, and contextual terms the user might search for later. Return ONLY the JSON array, nothing else.",
          },
          {
            role: "user",
            content: `Extract keywords from this note:\n\n${content.slice(0, 1000)}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `xAI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const raw = data.choices[0]?.message?.content?.trim() ?? "[]";

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((k): k is string => typeof k === "string");
      }
    } catch {
      // If AI returns non-JSON, split by commas
      return raw
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
    }

    return [];
  }
}
