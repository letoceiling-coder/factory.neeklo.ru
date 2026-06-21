import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { ElevenLabsService } from '../../integrations/tts/elevenlabs.service';
import { S3Service } from '../../integrations/storage/s3.service';
import { AvatarEngineService } from '../../integrations/avatar/avatar-engine.service';
import { FfmpegService } from './ffmpeg.service';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly elevenlabs: ElevenLabsService,
    private readonly s3: S3Service,
    private readonly avatarEngine: AvatarEngineService,
    private readonly ffmpeg: FfmpegService,
  ) {}

  /** Generate TTS audio for a single scene and store in S3. */
  async generateSceneAudio(sceneId: string): Promise<void> {
    const scene = await this.prisma.scene.findUnique({ where: { id: sceneId } });
    if (!scene) throw new Error(`Scene ${sceneId} not found`);

    let voiceId = scene.voiceId;
    let settings: any = {};
    if (voiceId) {
      const profile = await this.prisma.voiceProfile.findFirst({
        where: { OR: [{ id: voiceId }, { voiceId }] },
      });
      if (profile) {
        voiceId = profile.voiceId;
        settings = profile.settings || {};
      }
    }
    if (!voiceId) throw new Error('Scene has no voice assigned');

    const audio = await this.elevenlabs.synthesize(scene.text, {
      voiceId,
      stability: settings.stability,
      similarityBoost: settings.similarityBoost,
      style: settings.style,
      speed: settings.speed,
    });

    const key = `projects/${scene.projectId}/audio/${scene.id}.mp3`;
    await this.s3.upload(key, audio, 'audio/mpeg');

    await this.prisma.scene.update({
      where: { id: sceneId },
      data: { audioKey: key, status: 'tts_done' },
    });
    await this.prisma.asset.create({
      data: { kind: 'audio', key, name: `scene-${scene.order}.mp3`, size: audio.length },
    }).catch(() => undefined);
  }

  /** Render an avatar clip for a scene (audio-driven), poll provider, store result. */
  async renderSceneAvatar(sceneId: string, onProgress?: (p: number) => void): Promise<void> {
    const scene = await this.prisma.scene.findUnique({ where: { id: sceneId }, include: { avatar: true } });
    if (!scene) throw new Error(`Scene ${sceneId} not found`);
    if (!scene.audioKey) throw new Error('Scene audio not generated yet');
    if (!scene.avatar) throw new Error('Scene has no avatar assigned');

    const project = await this.prisma.videoProject.findUnique({ where: { id: scene.projectId } });
    const audioUrl = await this.s3.getPresignedUrl(scene.audioKey, 6 * 3600);
    const sourceImageUrl = scene.avatar.sourceImageKey
      ? await this.s3.getPresignedUrl(scene.avatar.sourceImageKey, 6 * 3600)
      : scene.avatar.previewUrl || null;

    const engine = this.avatarEngine.get(scene.avatar.engine as any);
    await this.prisma.scene.update({ where: { id: sceneId }, data: { status: 'rendering' } });

    const providerJobId = await engine.renderClip({
      audioUrl,
      engineAvatarId: scene.avatar.engineAvatarId,
      sourceImageUrl,
      aspectRatio: project?.aspectRatio || '16:9',
      background: scene.background,
    });

    // Poll up to ~20 minutes.
    let videoUrl: string | null = null;
    for (let i = 0; i < 240; i++) {
      await sleep(5000);
      const status = await engine.getStatus(providerJobId);
      if (onProgress) onProgress(status.progress ?? 50);
      if (status.status === 'done') {
        videoUrl = status.videoUrl || null;
        break;
      }
      if (status.status === 'failed') throw new Error(status.error || 'Avatar render failed');
    }
    if (!videoUrl) throw new Error('Avatar render timed out');

    const res = await fetch(videoUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    const key = `projects/${scene.projectId}/clips/${scene.id}.mp4`;
    await this.s3.upload(key, buf, 'video/mp4');

    await this.prisma.scene.update({ where: { id: sceneId }, data: { clipKey: key, status: 'rendered' } });
    await this.prisma.asset.create({
      data: { kind: 'video', key, name: `clip-${scene.order}.mp4`, size: buf.length },
    }).catch(() => undefined);
  }

  /** Assemble all rendered scene clips of a project into a final video. */
  async assembleProject(projectId: string): Promise<string> {
    const project = await this.prisma.videoProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');
    const scenes = await this.prisma.scene.findMany({
      where: { projectId, clipKey: { not: null } },
      orderBy: { order: 'asc' },
    });
    if (scenes.length === 0) throw new Error('No rendered clips to assemble');

    const work = this.ffmpeg.tmpDir();
    try {
      const clips: { videoPath: string; caption: string }[] = [];
      for (const scene of scenes) {
        const buf = await this.s3.getObject(scene.clipKey!);
        const local = path.join(work, `scene_${scene.order}.mp4`);
        fs.writeFileSync(local, buf);
        clips.push({ videoPath: local, caption: scene.text });
      }

      const outputPath = path.join(work, 'final.mp4');
      await this.ffmpeg.assemble({
        clips,
        outputPath,
        aspectRatio: project.aspectRatio,
        withCaptions: (project.meta as any)?.captions ?? false,
      });

      const finalBuf = fs.readFileSync(outputPath);
      const key = `projects/${projectId}/final.mp4`;
      await this.s3.upload(key, finalBuf, 'video/mp4');
      const url = await this.s3.getPresignedUrl(key, 24 * 3600);
      const durationMs = await this.ffmpeg.probeDurationMs(outputPath);

      await this.prisma.videoProject.update({
        where: { id: projectId },
        data: { finalVideoKey: key, finalVideoUrl: url, durationMs, status: 'ready' },
      });
      await this.prisma.asset.create({
        data: { kind: 'video', key, name: `${project.title}.mp4`, size: finalBuf.length, meta: { durationMs } },
      }).catch(() => undefined);

      return key;
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  }
}
