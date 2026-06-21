import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { PipelineService } from '../pipeline/pipeline.service';
import { QueuesService } from './queues.service';
import { getRedisConnection, QUEUE_TTS, QUEUE_AVATAR, QUEUE_ASSEMBLE } from './redis';

@Injectable()
export class WorkersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkersService.name);
  private workers: Worker[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: PipelineService,
    private readonly queues: QueuesService,
  ) {}

  onModuleInit() {
    const connection = getRedisConnection();

    const ttsWorker = new Worker(
      QUEUE_TTS,
      async (job) => {
        const { jobId, sceneId } = job.data;
        await this.markActive(jobId);
        try {
          await this.pipeline.generateSceneAudio(sceneId);
          await this.markCompleted(jobId);
          const scene = await this.prisma.scene.findUnique({ where: { id: sceneId } });
          if (scene) await this.queues.enqueueAvatar(sceneId, scene.projectId);
        } catch (err: any) {
          await this.handleSceneFailure(sceneId, jobId, err.message);
          throw err;
        }
      },
      { connection, concurrency: 3 },
    );

    const avatarWorker = new Worker(
      QUEUE_AVATAR,
      async (job) => {
        const { jobId, sceneId } = job.data;
        await this.markActive(jobId);
        try {
          await this.pipeline.renderSceneAvatar(sceneId, (p) => this.updateProgress(jobId, p));
          await this.markCompleted(jobId);
          await this.maybeAssemble(sceneId);
        } catch (err: any) {
          await this.handleSceneFailure(sceneId, jobId, err.message);
          throw err;
        }
      },
      { connection, concurrency: 2 },
    );

    const assembleWorker = new Worker(
      QUEUE_ASSEMBLE,
      async (job) => {
        const { jobId, projectId } = job.data;
        await this.markActive(jobId);
        try {
          await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: 'assembling' } });
          const key = await this.pipeline.assembleProject(projectId);
          await this.markCompleted(jobId, key);
        } catch (err: any) {
          await this.markFailed(jobId, err.message);
          await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: 'failed' } }).catch(() => {});
          throw err;
        }
      },
      { connection, concurrency: 1 },
    );

    this.workers = [ttsWorker, avatarWorker, assembleWorker];
    for (const w of this.workers) {
      w.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} failed: ${err.message}`);
      });
    }
    this.logger.log('BullMQ workers started (tts, avatar, assemble)');
  }

  private async handleSceneFailure(sceneId: string, jobId: string, error: string) {
    await this.markFailed(jobId, error);
    const scene = await this.prisma.scene.findUnique({ where: { id: sceneId } });
    if (!scene) return;
    await this.prisma.scene.update({ where: { id: sceneId }, data: { status: 'failed' } });
    await this.syncProjectStatus(scene.projectId);
  }

  private async syncProjectStatus(projectId: string) {
    const scenes = await this.prisma.scene.findMany({ where: { projectId } });
    const inProgress = scenes.some((s) => ['pending', 'tts_done', 'rendering'].includes(s.status));
    if (inProgress) return;

    const allRendered = scenes.length > 0 && scenes.every((s) => s.status === 'rendered');
    const anyFailed = scenes.some((s) => s.status === 'failed');

    if (allRendered) return;
    if (anyFailed) {
      await this.prisma.videoProject.update({ where: { id: projectId }, data: { status: 'failed' } });
    }
  }

  private async maybeAssemble(sceneId: string) {
    const scene = await this.prisma.scene.findUnique({ where: { id: sceneId } });
    if (!scene) return;
    const remaining = await this.prisma.scene.count({
      where: { projectId: scene.projectId, status: { not: 'rendered' } },
    });
    if (remaining === 0) {
      await this.queues.enqueueAssemble(scene.projectId);
    } else {
      await this.syncProjectStatus(scene.projectId);
    }
  }

  private markActive(jobId: string) {
    return this.prisma.renderJob.update({ where: { id: jobId }, data: { status: 'active' } }).catch(() => {});
  }
  private markCompleted(jobId: string, outputKey?: string) {
    return this.prisma.renderJob
      .update({ where: { id: jobId }, data: { status: 'completed', progress: 100, outputKey } })
      .catch(() => {});
  }
  private markFailed(jobId: string, error: string) {
    return this.prisma.renderJob.update({ where: { id: jobId }, data: { status: 'failed', error } }).catch(() => {});
  }
  private updateProgress(jobId: string, progress: number) {
    return this.prisma.renderJob.update({ where: { id: jobId }, data: { progress } }).catch(() => {});
  }

  async onModuleDestroy() {
    await Promise.allSettled(this.workers.map((w) => w.close()));
  }
}
