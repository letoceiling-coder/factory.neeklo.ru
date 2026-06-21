export type AvatarEngineSlug = 'heygen' | 'hedra' | 'did';

export interface RenderClipParams {
  /** Presigned URL of the ElevenLabs audio (audio-driven lip sync). */
  audioUrl: string;
  /** Provider-side avatar id (talking_photo / avatar id), when using a preset. */
  engineAvatarId?: string | null;
  /** Presigned URL of a source image (photo avatar), when no engineAvatarId. */
  sourceImageUrl?: string | null;
  /** preset = HeyGen catalog avatar; photo = talking photo from image. */
  avatarKind?: 'preset' | 'photo';
  aspectRatio?: string;
  background?: string | null;
}

export interface RenderStatus {
  status: 'processing' | 'done' | 'failed';
  videoUrl?: string | null;
  progress?: number;
  error?: string | null;
}

export interface AvatarEngine {
  readonly slug: AvatarEngineSlug;
  /** Start an async render job, returns provider job id. */
  renderClip(params: RenderClipParams): Promise<string>;
  /** Poll job status. */
  getStatus(providerJobId: string): Promise<RenderStatus>;
}
