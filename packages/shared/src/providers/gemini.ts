import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider } from "./base.js";
import type { AIRequestOptions, AIResponse } from "../types.js";

export class GeminiProvider extends AIProvider {
  readonly name = "gemini" as const;
  readonly defaultModel = "gemini-2.0-flash";

  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    super();
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model ?? this.defaultModel;
  }

  private buildParts(options: AIRequestOptions): Array<string | { inlineData: { data: string; mimeType: string } }> {
    const parts: Array<string | { inlineData: { data: string; mimeType: string } }> = [];
    if (options.imageBase64) {
      parts.push({ inlineData: { data: options.imageBase64, mimeType: options.imageMimeType ?? "image/png" } });
    }
    const text = options.textContent
      ? `${options.prompt}\n\n---\n${options.textContent}`
      : options.prompt;
    parts.push(text);
    return parts;
  }

  async query(options: AIRequestOptions): Promise<AIResponse> {
    const start = Date.now();
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: { maxOutputTokens: options.maxTokens ?? 1024 },
    });
    const result = await genModel.generateContent(this.buildParts(options));
    return {
      text: result.response.text(),
      provider: this.name,
      model: this.model,
      durationMs: Date.now() - start,
    };
  }

  async *queryStream(options: AIRequestOptions): AsyncGenerator<string, AIResponse, undefined> {
    const start = Date.now();
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: { maxOutputTokens: options.maxTokens ?? 1024 },
    });
    const result = await genModel.generateContentStream(this.buildParts(options));

    for await (const chunk of result.stream) {
      if (options.signal?.aborted) break;
      const part = chunk.text();
      if (part) yield part;
    }

    const final = await result.response;
    return { text: final.text(), provider: this.name, model: this.model, durationMs: Date.now() - start };
  }
}
