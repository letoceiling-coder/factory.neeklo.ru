import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { getRedisConnection, QUEUE_TTS, QUEUE_AVATAR, QUEUE_ASSEMBLE } from './redis';

@Injectable()
export class QueuesService implements OnModuleDestroy {
  readonly tts: Queue;
  readonly avatar: Queue;
  readonly assemble: Queue;

  constructor(private readonly prisma: PrismaService) {
    const connection = getRedisConnection();
    this.tts = new Queue(QUEUE_TTS, { connection });
    this.avatar = new Queue(QUEUE_AVATAR, { connection });
    this.assemble = new Queue(QUEUE_ASSEMBLE, { connection });
  }

  async enqueueTts(sceneId: string, projectId: string) {
    const job = await this.prisma.renderJob.create({
      data: { type: 'tts', status: 'queued', sceneId, projectId, input: { sceneId } },
    });
    await this.tts.add('tts', { jobId: job.id, sceneId }, { attempts: 2, removeOnComplete: 100 });
    return job;
  }

  async enqueueAvatar(sceneId: string, projectId: string) {
    const job = await this.prisma.renderJob.create({
      data: { type: 'avatar', status: 'queued', sceneId, projectId, input: { sceneId } },
    });
    await this.avatar.add('avatar', { jobId: job.id, sceneId }, { attempts: 2, removeOnComplete: 100 });
    return job;
  }

  async enqueueAssemble(projectId: string) {
    const job = await this.prisma.renderJob.create({
      data: { type: 'assemble', status: 'queued', projectId, input: { projectId } },
    });
    await this.assemble.add('assemble', { jobId: job.id, projectId }, { attempts: 1, removeOnComplete: 50 });
    return job;
  }

  async onModuleDestroy() {
    await Promise.allSettled([this.tts.close(), this.avatar.close(), this.assemble.close()]);
  }
}
