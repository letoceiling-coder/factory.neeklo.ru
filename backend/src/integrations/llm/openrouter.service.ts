import { Injectable, Logger } from '@nestjs/common';
import { ProviderCredentialsService } from '../provider-credentials.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: any[];
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  tools?: any[];
  toolChoice?: 'auto' | 'none' | any;
  maxTokens?: number;
  responseFormat?: any;
}

export interface ChatResult {
  content: string | null;
  toolCalls: any[];
  raw: any;
}

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(private readonly creds: ProviderCredentialsService) {}

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const { apiKey, config } = await this.creds.resolve('openrouter');
    if (!apiKey) throw new Error('OpenRouter API key is not configured');

    const body: any = {
      model: options.model || config.defaultModel || 'openai/gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.7,
    };
    if (options.tools) body.tools = options.tools;
    if (options.toolChoice) body.tool_choice = options.toolChoice;
    if (options.maxTokens) body.max_tokens = options.maxTokens;
    if (options.responseFormat) body.response_format = options.responseFormat;

    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://factory.neeklo.ru',
        'X-Title': 'Factory Video Studio',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`OpenRouter error ${res.status}: ${text}`);
      throw new Error(`OpenRouter request failed: ${res.status}`);
    }

    const data: any = await res.json();
    const choice = data.choices?.[0]?.message ?? {};
    return {
      content: choice.content ?? null,
      toolCalls: choice.tool_calls ?? [],
      raw: data,
    };
  }

  /** Convenience helper returning plain text. */
  async complete(prompt: string, system?: string, options: ChatOptions = {}): Promise<string> {
    const messages: ChatMessage[] = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });
    const result = await this.chat(messages, options);
    return result.content ?? '';
  }
}
