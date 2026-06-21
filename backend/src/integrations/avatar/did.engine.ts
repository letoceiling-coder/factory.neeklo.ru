import { Logger } from '@nestjs/common';
import { ProviderCredentialsService } from '../provider-credentials.service';
import { AvatarEngine, RenderClipParams, RenderStatus } from './avatar-engine.interface';

/**
 * D-ID Talks audio-driven avatar generation.
 * Docs: https://docs.d-id.com/
 */
export class DidEngine implements AvatarEngine {
  readonly slug = 'did' as const;
  private readonly logger = new Logger(DidEngine.name);

  constructor(private readonly creds: ProviderCredentialsService) {}

  private authHeader(apiKey: string): string {
    // D-ID uses Basic auth with base64("email:apikey") or "Bearer" for newer keys.
    return apiKey.includes(':') ? `Basic ${Buffer.from(apiKey).toString('base64')}` : `Basic ${apiKey}`;
  }

  async renderClip(params: RenderClipParams): Promise<string> {
    const { apiKey, config } = await this.creds.resolve('did');
    if (!apiKey) throw new Error('D-ID API key is not configured');

    const res = await fetch(`${config.baseUrl}/talks`, {
      method: 'POST',
      headers: { Authorization: this.authHeader(apiKey), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_url: params.sourceImageUrl,
        script: { type: 'audio', audio_url: params.audioUrl },
        config: { stitch: true },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      this.logger.error(`D-ID render error ${res.status}: ${t}`);
      throw new Error(`D-ID render failed: ${res.status}`);
    }
    const data: any = await res.json();
    if (!data?.id) throw new Error('D-ID did not return id');
    return data.id;
  }

  async getStatus(providerJobId: string): Promise<RenderStatus> {
    const { apiKey, config } = await this.creds.resolve('did');
    const res = await fetch(`${config.baseUrl}/talks/${providerJobId}`, {
      headers: { Authorization: this.authHeader(apiKey!) },
    });
    if (!res.ok) return { status: 'processing' };
    const data: any = await res.json();
    if (data?.status === 'done') return { status: 'done', videoUrl: data.result_url, progress: 100 };
    if (data?.status === 'error' || data?.status === 'rejected')
      return { status: 'failed', error: JSON.stringify(data?.error || 'failed') };
    return { status: 'processing', progress: 50 };
  }
}
