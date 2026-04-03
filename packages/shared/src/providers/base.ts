import type { AIRequestOptions, AIResponse, AIProviderName } from "../types.js";

export abstract class AIProvider {
  abstract readonly name: AIProviderName;
  abstract readonly defaultModel: string;

  abstract query(options: AIRequestOptions): Promise<AIResponse>;

  /**
   * Stream tokens as they arrive. Yields each text delta as a string.
   * The generator's return value (accessible via the final .next() call
   * when done === true) is the complete AIResponse.
   */
  abstract queryStream(
    options: AIRequestOptions,
  ): AsyncGenerator<string, AIResponse, undefined>;

  protected dataUri(base64: string, mimeType = "image/png"): string {
    return `data:${mimeType};base64,${base64}`;
  }
}
