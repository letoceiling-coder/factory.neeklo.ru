import { Injectable, Logger } from '@nestjs/common';
import { ProviderCredentialsService } from '../provider-credentials.service';

export interface TtsOptions {
  voiceId: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speed?: number;
}

export interface VoiceInfo {
  voiceId: string;
  name: string;
  previewUrl?: string;
  labels?: Record<string, string>;
}

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);

  constructor(private readonly creds: ProviderCredentialsService) {}

  async listVoices(): Promise<VoiceInfo[]> {
    const { apiKey, config } = await this.creds.resolve('elevenlabs');
    if (!apiKey) throw new Error('ElevenLabs API key is not configured');
    const res = await fetch(`${config.baseUrl}/v1/voices`, {
      headers: { 'xi-api-key': apiKey },
    });
    if (!res.ok) throw new Error(`ElevenLabs voices failed: ${res.status}`);
    const data: any = await res.json();
    return (data.voices || []).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      previewUrl: v.preview_url,
      labels: v.labels,
    }));
  }

  /** Synthesize speech, returns audio buffer (mp3). */
  async synthesize(text: string, options: TtsOptions): Promise<Buffer> {
    const { apiKey, config } = await this.creds.resolve('elevenlabs');
    if (!apiKey) throw new Error('ElevenLabs API key is not configured');

    const res = await fetch(`${config.baseUrl}/v1/text-to-speech/${options.voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: options.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0,
          speed: options.speed ?? 1.0,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`ElevenLabs TTS error ${res.status}: ${errText}`);
      throw new Error(`ElevenLabs TTS failed: ${res.status}`);
    }
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }
}
