import OpenAI from "openai";
import { AIProvider } from "./base.js";
import type { AIRequestOptions, AIResponse } from "../types.js";

type MessageContent =
  | { type: "image_url"; image_url: { url: string } }
  | { type: "text"; text: string };

export class OpenAIProvider extends AIProvider {
  readonly name = "openai" as const;
  readonly defaultModel = "gpt-4o";

  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model ?? this.defaultModel;
  }

  private buildContent(options: AIRequestOptions): MessageContent[] {
    const content: MessageContent[] = [];
    if (options.imageBase64) {
      content.push({
        type: "image_url",
        image_url: { url: this.dataUri(options.imageBase64, options.imageMimeType) },
      });
    }
    const text = options.textContent
      ? `${options.prompt}\n\n---\n${options.textContent}`
      : options.prompt;
    content.push({ type: "text", text });
    return content;
  }

  async query(options: AIRequestOptions): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create(
      {
        model: this.model,
        max_tokens: options.maxTokens ?? 1024,
        messages: [{ role: "user", content: this.buildContent(options) }],
      },
      { signal: options.signal },
    );
    return {
      text: response.choices[0]?.message?.content ?? "",
      provider: this.name,
      model: this.model,
      durationMs: Date.now() - start,
    };
  }

  async *queryStream(options: AIRequestOptions): AsyncGenerator<string, AIResponse, undefined> {
    const start = Date.now();
    const stream = await this.client.chat.completions.create(
      {
        model: this.model,
        max_tokens: options.maxTokens ?? 1024,
        stream: true,
        messages: [{ role: "user", content: this.buildContent(options) }],
      },
      { signal: options.signal },
    );

    let text = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) { text += delta; yield delta; }
    }
    return { text, provider: this.name, model: this.model, durationMs: Date.now() - start };
  }
}
