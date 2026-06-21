import { Logger } from '@nestjs/common';
import { ProviderCredentialsService } from '../provider-credentials.service';
import { AvatarEngine, RenderClipParams, RenderStatus } from './avatar-engine.interface';

/**
 * Hedra Character-3 audio-driven avatar generation.
 * Docs: https://docs.hedra.com/
 */
export class HedraEngine implements AvatarEngine {
  readonly slug = 'hedra' as const;
  private readonly logger = new Logger(HedraEngine.name);

  constructor(private readonly creds: ProviderCredentialsService) {}

  async renderClip(params: RenderClipParams): Promise<string> {
    const { apiKey, config } = await this.creds.resolve('hedra');
    if (!apiKey) throw new Error('Hedra API key is not configured');

    const res = await fetch(`${config.baseUrl}/v1/projects`, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aspectRatio: (params.aspectRatio || '16:9') === '9:16' ? '9:16' : '16:9',
        audioSource: 'provided',
        voiceUrl: params.audioUrl,
        avatarImageInput: { imageUrl: params.sourceImageUrl },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      this.logger.error(`Hedra render error ${res.status}: ${t}`);
      throw new Error(`Hedra render failed: ${res.status}`);
    }
    const data: any = await res.json();
    const id = data?.jobId || data?.id;
    if (!id) throw new Error('Hedra did not return job id');
    return id;
  }

  async getStatus(providerJobId: string): Promise<RenderStatus> {
    const { apiKey, config } = await this.creds.resolve('hedra');
    const res = await fetch(`${config.baseUrl}/v1/projects/${providerJobId}`, {
      headers: { 'X-API-KEY': apiKey! },
    });
    if (!res.ok) return { status: 'processing' };
    const data: any = await res.json();
    const status = (data?.status || '').toLowerCase();
    if (status === 'completed' || status === 'complete')
      return { status: 'done', videoUrl: data.videoUrl || data.url, progress: 100 };
    if (status === 'failed' || status === 'error')
      return { status: 'failed', error: data?.errorMessage || 'failed' };
    return { status: 'processing', progress: data?.progress ?? 50 };
  }
}
