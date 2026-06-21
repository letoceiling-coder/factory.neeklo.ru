import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenRouterService, ChatMessage } from '../../integrations/llm/openrouter.service';
import { VideosService } from '../videos/videos.service';
import { AGENT_TOOLS, AGENT_SYSTEM, ToolDef } from './agent.tools';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: OpenRouterService,
    private readonly videos: VideosService,
  ) {}

  private toolSchemas() {
    return AGENT_TOOLS.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));
  }

  listSessions(userId?: string) {
    return this.prisma.agentSession.findMany({
      where: userId ? { userId } : {},
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createSession(userId?: string, title?: string) {
    return this.prisma.agentSession.create({ data: { userId, title: title || 'Новая сессия' } });
  }

  async getSession(id: string) {
    const session = await this.prisma.agentSession.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async deleteSession(id: string) {
    await this.prisma.agentSession.delete({ where: { id } });
    return { ok: true };
  }

  private async history(sessionId: string): Promise<ChatMessage[]> {
    const msgs = await this.prisma.agentMessage.findMany({
      where: { sessionId, pending: false },
      orderBy: { createdAt: 'asc' },
    });
    const out: ChatMessage[] = [{ role: 'system', content: AGENT_SYSTEM }];
    for (const m of msgs) {
      if (m.role === 'tool') {
        out.push({ role: 'tool', content: m.content, tool_call_id: (m.toolCalls as any)?.id, name: m.toolName || undefined });
      } else if (m.role === 'assistant' && m.toolCalls) {
        out.push({ role: 'assistant', content: m.content || null, tool_calls: (m.toolCalls as any)?.calls });
      } else {
        out.push({ role: m.role as any, content: m.content });
      }
    }
    return out;
  }

  /** Main entry: user sends a message; runs the tool-calling loop. */
  async send(sessionId: string, content: string) {
    await this.getSession(sessionId);
    await this.prisma.agentMessage.create({ data: { sessionId, role: 'user', content } });
    await this.prisma.agentSession.update({ where: { id: sessionId }, data: { updatedAt: new Date() } });
    return this.runLoop(sessionId);
  }

  /** Confirm or reject a pending (confirmation-gated) tool call. */
  async confirm(messageId: string, approved: boolean) {
    const pending = await this.prisma.agentMessage.findUnique({ where: { id: messageId } });
    if (!pending || !pending.pending) throw new NotFoundException('No pending action');
    const call = (pending.toolCalls as any)?.calls?.[0];

    // Materialize the assistant tool_call message into history.
    await this.prisma.agentMessage.update({
      where: { id: messageId },
      data: { pending: false },
    });

    if (!approved) {
      await this.prisma.agentMessage.create({
        data: {
          sessionId: pending.sessionId,
          role: 'tool',
          toolName: call?.function?.name,
          content: JSON.stringify({ declined: true, message: 'Пользователь отклонил операцию' }),
          toolCalls: { id: call?.id },
        },
      });
      return this.runLoop(pending.sessionId);
    }

    const result = await this.execTool(call.function.name, this.parseArgs(call.function.arguments));
    await this.prisma.agentMessage.create({
      data: {
        sessionId: pending.sessionId,
        role: 'tool',
        toolName: call.function.name,
        content: JSON.stringify(result),
        toolCalls: { id: call.id },
      },
    });
    return this.runLoop(pending.sessionId);
  }

  private parseArgs(args: any): any {
    if (typeof args === 'string') {
      try {
        return JSON.parse(args);
      } catch {
        return {};
      }
    }
    return args || {};
  }

  private async runLoop(sessionId: string) {
    for (let i = 0; i < 6; i++) {
      const messages = await this.history(sessionId);
      const res = await this.llm.chat(messages, { tools: this.toolSchemas(), toolChoice: 'auto' });

      if (!res.toolCalls || res.toolCalls.length === 0) {
        await this.prisma.agentMessage.create({
          data: { sessionId, role: 'assistant', content: res.content || '' },
        });
        return this.getSession(sessionId);
      }

      const call = res.toolCalls[0];
      const def = AGENT_TOOLS.find((t) => t.name === call.function.name) as ToolDef | undefined;

      // Persist the assistant message carrying the tool call.
      const assistantMsg = await this.prisma.agentMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: res.content || '',
          toolName: call.function.name,
          toolCalls: { calls: res.toolCalls, id: call.id },
          pending: !!def?.requiresConfirmation,
        },
      });

      if (def?.requiresConfirmation) {
        // Stop and wait for user confirmation.
        return this.getSession(sessionId);
      }

      const result = await this.execTool(call.function.name, this.parseArgs(call.function.arguments));
      await this.prisma.agentMessage.update({ where: { id: assistantMsg.id }, data: { pending: false } });
      await this.prisma.agentMessage.create({
        data: {
          sessionId,
          role: 'tool',
          toolName: call.function.name,
          content: JSON.stringify(result),
          toolCalls: { id: call.id },
        },
      });
    }
    await this.prisma.agentMessage.create({
      data: { sessionId, role: 'assistant', content: 'Достигнут лимит шагов. Уточните запрос.' },
    });
    return this.getSession(sessionId);
  }

  private async execTool(name: string, args: any): Promise<any> {
    try {
      switch (name) {
        case 'list_avatars':
          return await this.prisma.avatar.findMany({ select: { id: true, name: true, engine: true } });
        case 'list_voices':
          return await this.prisma.voiceProfile.findMany({ select: { id: true, name: true, voiceId: true, language: true } });
        case 'list_projects':
          return await this.prisma.videoProject.findMany({ select: { id: true, title: true, status: true } });
        case 'create_video_project':
          return await this.videos.create(args);
        case 'generate_script':
          return await this.videos.generateScript(args.projectId, args);
        case 'get_project':
          return await this.videos.get(args.projectId);
        case 'start_generation':
          return await this.videos.startGeneration(args.projectId);
        case 'get_job_status':
          return await this.prisma.renderJob.findMany({
            where: { projectId: args.projectId },
            select: { type: true, status: true, progress: true, error: true },
          });
        default:
          return { error: `Unknown tool ${name}` };
      }
    } catch (e: any) {
      return { error: e.message };
    }
  }
}
