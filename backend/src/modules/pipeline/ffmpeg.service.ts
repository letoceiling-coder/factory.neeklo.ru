import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface AssembleClip {
  /** Local path to a rendered scene video. */
  videoPath: string;
  /** Optional subtitle text for this clip. */
  caption?: string;
}

export interface AssembleOptions {
  clips: AssembleClip[];
  outputPath: string;
  musicPath?: string | null;
  musicVolume?: number;
  aspectRatio?: string;
  withCaptions?: boolean;
}

@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name);
  private readonly ffmpeg: string;
  private readonly ffprobe: string;

  constructor(config: ConfigService) {
    this.ffmpeg = config.get('FFMPEG_PATH') || 'ffmpeg';
    this.ffprobe = config.get('FFPROBE_PATH') || 'ffprobe';
  }

  tmpDir(): string {
    const dir = path.join(os.tmpdir(), 'factory-render', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private run(bin: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(bin, args);
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => (stdout += d.toString()));
      proc.stderr.on('data', (d) => (stderr += d.toString()));
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve(stdout || stderr);
        else reject(new Error(`${bin} exited ${code}: ${stderr.slice(-2000)}`));
      });
    });
  }

  async probeDurationMs(file: string): Promise<number> {
    try {
      const out = await this.run(this.ffprobe, [
        '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file,
      ]);
      const seconds = parseFloat(out.trim());
      return Number.isFinite(seconds) ? Math.round(seconds * 1000) : 0;
    } catch {
      return 0;
    }
  }

  /** Normalize a clip to a consistent codec/size so concat works reliably. */
  private async normalize(input: string, output: string, aspect: string): Promise<void> {
    const [w, h] = aspect === '9:16' ? [720, 1280] : aspect === '1:1' ? [1080, 1080] : [1280, 720];
    await this.run(this.ffmpeg, [
      '-y', '-i', input,
      '-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
      '-c:a', 'aac', '-ar', '44100', '-b:a', '128k',
      output,
    ]);
  }

  private escapeSubtitle(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/'/g, "\u2019").replace(/:/g, '\\:').replace(/\n/g, ' ');
  }

  /**
   * Assemble multiple scene clips into one final video.
   * Steps: normalize each clip -> optional burned captions -> concat -> optional bg music.
   */
  async assemble(opts: AssembleOptions): Promise<void> {
    const aspect = opts.aspectRatio || '16:9';
    const work = path.dirname(opts.outputPath);
    const normalized: string[] = [];

    for (let i = 0; i < opts.clips.length; i++) {
      const clip = opts.clips[i];
      let current = path.join(work, `norm_${i}.mp4`);
      await this.normalize(clip.videoPath, current, aspect);

      if (opts.withCaptions && clip.caption) {
        const captioned = path.join(work, `cap_${i}.mp4`);
        const text = this.escapeSubtitle(clip.caption.slice(0, 120));
        await this.run(this.ffmpeg, [
          '-y', '-i', current,
          '-vf', `drawtext=text='${text}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.5:boxborderw=12:x=(w-text_w)/2:y=h-th-60`,
          '-c:a', 'copy', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
          captioned,
        ]).catch(() => {});
        if (fs.existsSync(captioned)) current = captioned;
      }
      normalized.push(current);
    }

    const listFile = path.join(work, 'concat.txt');
    fs.writeFileSync(listFile, normalized.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));

    const concatOut = opts.musicPath ? path.join(work, 'concat.mp4') : opts.outputPath;
    await this.run(this.ffmpeg, [
      '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', concatOut,
    ]);

    if (opts.musicPath) {
      const vol = opts.musicVolume ?? 0.15;
      await this.run(this.ffmpeg, [
        '-y', '-i', concatOut, '-i', opts.musicPath,
        '-filter_complex', `[1:a]volume=${vol}[bg];[0:a][bg]amix=inputs=2:duration=first:dropout_transition=2[a]`,
        '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-shortest',
        opts.outputPath,
      ]);
    }
  }
}
