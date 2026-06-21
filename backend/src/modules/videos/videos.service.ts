import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenRouterService } from '../../integrations/llm/openrouter.service';
import { QueuesService } from '../jobs/queues.service';

const SCRIPT_SYSTEM = `Ты — профессиональный сценарист видеороликов с говорящим аватаром.
По брифу создай связный, естественный разговорный сценарий для произнесения вслух.
Раздели на сцены (каждая 1-3 предложения, естественная живая речь).
Отвечай СТРОГО JSON: {"title":"...","script":"полный текст","scenes":["реплика 1","реплика 2"]}.
Пиши на языке, указанном пользователем.`;

@Injectable()
export class VideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: OpenRouterService,
    private readonly queues: QueuesService,
  ) {}

  list() {
    return this.prisma.videoProject.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { scenes: true } } },
    });
  }

  async get(id: string) {
    const project = await this.prisma.videoProject.findUnique({
      where: { id },
      include: { scenes: { orderBy: { order: 'asc' }, include: { avatar: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  create(data: { title: string; brief?: string; language?: string; aspectRatio?: string }) {
    return this.prisma.videoProject.create({
      data: {
        title: data.title,
        brief: data.brief,
        language: data.language || 'ru',
        aspectRatio: data.aspectRatio || '16:9',
        status: 'draft',
      },
    });
  }

  async update(id: string, data: any) {
    await this.get(id);
    return this.prisma.videoProject.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.prisma.videoProject.delete({ where: { id } });
    return { ok: true };
  }

  /** Generate script + scenes via OpenRouter and persist scenes. */
  async generateScript(id: string, opts: { targetScenes?: number; tone?: string; avatarId?: string; voiceId?: string }) {
    const project = await this.get(id);
    await this.prisma.videoProject.update({ where: { id }, data: { status: 'scripting' } });

    const prompt = `Бриф: ${project.brief || project.title}\nЯзык: ${project.language}\nЖелаемое число сцен: ${
      opts.targetScenes || 6
    }\nТон: ${opts.tone || 'информативный'}`;
    const raw = await this.llm.complete(prompt, SCRIPT_SYSTEM, { responseFormat: { type: 'json_object' } });

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { script: raw, scenes: raw.split(/\n+/).filter(Boolean) };
    }

    const scenes: string[] = parsed.scenes || [];
    await this.prisma.scene.deleteMany({ where: { projectId: id } });
    await this.prisma.scene.createMany({
      data: scenes.map((text, i) => ({
        projectId: id,
        order: i,
        text,
        avatarId: opts.avatarId || null,
        voiceId: opts.voiceId || null,
        status: 'pending',
      })),
    });

    return this.prisma.videoProject.update({
      where: { id },
      data: { script: parsed.script || scenes.join('\n\n'), status: 'draft' },
    });
  }

  async updateScene(sceneId: string, data: any) {
    return this.prisma.scene.update({ where: { id: sceneId }, data });
  }

  async addScene(projectId: string, data: { text: string; avatarId?: string; voiceId?: string }) {
    const max = await this.prisma.scene.aggregate({ where: { projectId }, _max: { order: true } });
    return this.prisma.scene.create({
      data: {
        projectId,
        order: (max._max.order ?? -1) + 1,
        text: data.text,
        avatarId: data.avatarId,
        voiceId: data.voiceId,
        status: 'pending',
      },
    });
  }

  async deleteScene(sceneId: string) {
    await this.prisma.scene.delete({ where: { id: sceneId } });
    return { ok: true };
  }

  /** Kick off full generation: TTS -> Avatar -> Assemble (chained in workers). */
  async startGeneration(id: string) {
    const project = await this.get(id);
    if (project.scenes.length === 0) throw new BadRequestException('Project has no scenes');
    for (const scene of project.scenes) {
      if (!scene.voiceId) throw new BadRequestException(`Scene #${scene.order + 1} has no voice`);
      if (!scene.avatarId) throw new BadRequestException(`Scene #${scene.order + 1} has no avatar`);
    }
    await this.prisma.scene.updateMany({ where: { projectId: id }, data: { status: 'pending' } });
    await this.prisma.videoProject.update({ where: { id }, data: { status: 'generating' } });
    for (const scene of project.scenes) {
      await this.queues.enqueueTts(scene.id, id);
    }
    return { ok: true, scenes: project.scenes.length };
  }
}
