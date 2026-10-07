import Anthropic from '@anthropic-ai/sdk';

/**
 * Text completion used to phrase catalogue-grounded answers. Callers always
 * build the prompt with groundedPrompt() from @bt/core, so the model only
 * sees retrieved catalogue/policy facts. Returning null means "use the
 * deterministic answer" — the mock adapter always does.
 */
export interface Ai {
  readonly name: string;
  complete(prompt: string): Promise<string | null>;
}

export class MockAi implements Ai {
  readonly name = 'mock';
  async complete(): Promise<string | null> {
    return null;
  }
}

export class AnthropicAi implements Ai {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly model = 'claude-opus-5-5',
  ) {
    this.client = new Anthropic({ apiKey, timeout: 20_000, maxRetries: 1 });
  }

  async complete(prompt: string): Promise<string | null> {
    try {
      const res = await this.client.beta.messages.create({
        model: this.model,
        max_tokens: 1024,
        // Short, grounded answers: low effort keeps latency down.
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages: [{ role: 'user', content: prompt }],
      } as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);
      if (res.stop_reason === 'refusal') return null;
      const text = res.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      return text || null;
    } catch (e) {
      if (e instanceof Anthropic.APIError) console.warn(`[ai] Anthropic API error ${e.status}`);
      else console.warn('[ai] request failed');
      return null;
    }
  }
}
