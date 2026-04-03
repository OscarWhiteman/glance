import Anthropic from "@anthropic-ai/sdk";
import { AIProvider } from "./base.js";
import type { AIRequestOptions, AIResponse } from "../types.js";
import type { ImageBlockParam, TextBlockParam } from "@anthropic-ai/sdk/resources/messages.js";

type ContentBlock = ImageBlockParam | TextBlockParam;

export class AnthropicProvider extends AIProvider {
  readonly name = "anthropic" as const;
  readonly defaultModel = "claude-3-haiku-20240307";

  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model ?? this.defaultModel;
  }

  private buildContent(options: AIRequestOptions): ContentBlock[] {
    const content: ContentBlock[] = [];
    if (options.imageBase64) {
      const mimeType = (options.imageMimeType ?? "image/png") as "image/png" | "image/jpeg" | "image/gif" | "image/webp";
      content.push({
        type: "image",
        source: { type: "base64", media_type: mimeType, data: options.imageBase64 },
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
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens ?? 1024,
      messages: [{ role: "user", content: this.buildContent(options) }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return {
      text: textBlock?.type === "text" ? textBlock.text : "",
      provider: this.name,
      model: this.model,
      durationMs: Date.now() - start,
    };
  }

  async *queryStream(options: AIRequestOptions): AsyncGenerator<string, AIResponse, undefined> {
    const start = Date.now();
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: options.maxTokens ?? 1024,
      messages: [{ role: "user", content: this.buildContent(options) }],
    });

    for await (const event of stream) {
      if (options.signal?.aborted) { await stream.abort(); break; }
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }

    const final = await stream.finalMessage();
    const textBlock = final.content.find((b) => b.type === "text");
    return {
      text: textBlock?.type === "text" ? textBlock.text : "",
      provider: this.name,
      model: this.model,
      durationMs: Date.now() - start,
    };
  }
}
