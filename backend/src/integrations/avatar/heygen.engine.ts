import { Logger } from '@nestjs/common';
import { ProviderCredentialsService } from '../provider-credentials.service';
import { AvatarEngine, RenderClipParams, RenderStatus } from './avatar-engine.interface';

/**
 * HeyGen v2 video generation (audio-driven via audio asset URL).
 * Docs: https://docs.heygen.com/
 */
export class HeyGenEngine implements AvatarEngine {
  readonly slug = 'heygen' as const;
  private readonly logger = new Logger(HeyGenEngine.name);

  constructor(private readonly creds: ProviderCredentialsService) {}

  async renderClip(params: RenderClipParams): Promise<string> {
    const { apiKey, config } = await this.creds.resolve('heygen');
    if (!apiKey) throw new Error('HeyGen API key is not configured');

    const character = params.engineAvatarId
      ? { type: 'avatar', avatar_id: params.engineAvatarId, avatar_style: 'normal' }
      : { type: 'talking_photo', talking_photo_id: params.engineAvatarId };

    const [w, h] = (params.aspectRatio || '16:9') === '9:16' ? [720, 1280] : [1280, 720];

    const res = await fetch(`${config.baseUrl}/v2/video/generate`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_inputs: [
          {
            character,
            voice: { type: 'audio', audio_url: params.audioUrl },
            background: params.background
              ? { type: 'color', value: params.background }
              : { type: 'color', value: '#0a0a0f' },
          },
        ],
        dimension: { width: w, height: h },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      this.logger.error(`HeyGen render error ${res.status}: ${t}`);
      throw new Error(`HeyGen render failed: ${res.status}`);
    }
    const data: any = await res.json();
    const id = data?.data?.video_id;
    if (!id) throw new Error('HeyGen did not return video_id');
    return id;
  }

  async getStatus(providerJobId: string): Promise<RenderStatus> {
    const { apiKey, config } = await this.creds.resolve('heygen');
    const res = await fetch(`${config.baseUrl}/v1/video_status.get?video_id=${providerJobId}`, {
      headers: { 'X-Api-Key': apiKey! },
    });
    if (!res.ok) return { status: 'processing' };
    const data: any = await res.json();
    const status = data?.data?.status;
    if (status === 'completed') return { status: 'done', videoUrl: data.data.video_url, progress: 100 };
    if (status === 'failed') return { status: 'failed', error: data?.data?.error?.message || 'failed' };
    return { status: 'processing', progress: 50 };
  }
}
