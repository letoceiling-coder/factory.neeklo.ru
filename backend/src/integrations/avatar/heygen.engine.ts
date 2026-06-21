import { Logger } from '@nestjs/common';
import { ProviderCredentialsService } from '../provider-credentials.service';
import { externalFetch } from '../../shared/http/external-fetch';
import { AvatarEngine, RenderClipParams, RenderStatus } from './avatar-engine.interface';

/**
 * HeyGen v2 video generation (audio-driven via audio asset URL).
 * Docs: https://docs.heygen.com/
 */
export class HeyGenEngine implements AvatarEngine {
  readonly slug = 'heygen' as const;
  private readonly logger = new Logger(HeyGenEngine.name);

  constructor(private readonly creds: ProviderCredentialsService) {}

  /** Register a photo in HeyGen and return talking_photo_id for reuse. */
  async createTalkingPhotoFromUrl(imageUrl: string): Promise<string> {
    const { apiKey } = await this.creds.resolve('heygen');
    if (!apiKey) throw new Error('HeyGen API key is not configured');

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to fetch avatar photo (${imgRes.status})`);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';

    const uploadRes = await externalFetch('heygen', 'https://upload.heygen.com/v1/talking_photo', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': contentType },
      body: buf,
    });
    if (!uploadRes.ok) {
      const t = await uploadRes.text();
      this.logger.error(`HeyGen talking photo upload ${uploadRes.status}: ${t}`);
      throw new Error(`HeyGen talking photo upload failed: ${uploadRes.status}`);
    }
    const uploadData: any = await uploadRes.json();
    const id = uploadData?.data?.talking_photo_id;
    if (!id) throw new Error('HeyGen did not return talking_photo_id');
    this.logger.log(`HeyGen talking photo registered: ${id}`);
    return id;
  }

  async renderClip(params: RenderClipParams): Promise<string> {
    const { apiKey, config } = await this.creds.resolve('heygen');
    if (!apiKey) throw new Error('HeyGen API key is not configured');

    const isPhoto = params.avatarKind === 'photo' || (!params.engineAvatarId && !!params.sourceImageUrl);
    let talkingPhotoId: string | null = null;
    let avatarId: string | null = null;

    if (isPhoto) {
      talkingPhotoId = params.engineAvatarId || (params.sourceImageUrl
        ? await this.createTalkingPhotoFromUrl(params.sourceImageUrl)
        : null);
      if (!talkingPhotoId) throw new Error('Photo avatar requires a source image or HeyGen talking_photo_id');
    } else if (params.engineAvatarId) {
      avatarId = params.engineAvatarId;
    } else {
      throw new Error('Avatar requires engineAvatarId or source photo');
    }

    const character = talkingPhotoId
      ? { type: 'talking_photo', talking_photo_id: talkingPhotoId }
      : { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' };

    const [w, h] = (params.aspectRatio || '16:9') === '9:16' ? [720, 1280] : [1280, 720];

    const res = await externalFetch('heygen', `${config.baseUrl}/v2/video/generate`, {
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
      let detail = t.slice(0, 200);
      try {
        detail = JSON.parse(t)?.error?.message || detail;
      } catch {
        /* ignore */
      }
      throw new Error(`HeyGen render failed: ${detail}`);
    }
    const data: any = await res.json();
    const id = data?.data?.video_id;
    if (!id) throw new Error('HeyGen did not return video_id');
    return id;
  }

  async getStatus(providerJobId: string): Promise<RenderStatus> {
    const { apiKey, config } = await this.creds.resolve('heygen');
    const res = await externalFetch('heygen', `${config.baseUrl}/v1/video_status.get?video_id=${providerJobId}`, {
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
