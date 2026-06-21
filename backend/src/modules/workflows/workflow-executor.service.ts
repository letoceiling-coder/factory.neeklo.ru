import { Injectable, Logger } from '@nestjs/common';
import { OpenRouterService } from '../../integrations/llm/openrouter.service';
import { GraphNode } from './graph-engine';

export interface NodeRunResult {
  output: any;
  note: string;
}

const SCRIPT_SYSTEM = `Ты — профессиональный сценарист видеороликов с говорящим аватаром.
По брифу создай связный, естественный разговорный сценарий, который аватар произнесёт вслух.
Раздели его на сцены. Отвечай СТРОГО в формате JSON:
{"script":"полный текст","scenes":["реплика сцены 1","реплика сцены 2", ...]}.
Пиши на языке, указанном пользователем. Реплики должны звучать как живая человеческая речь.`;

@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(private readonly llm: OpenRouterService) {}

  async runNode(node: GraphNode, upstream: any[]): Promise<NodeRunResult> {
    const cfg = node.config || {};
    const firstUpstream = upstream[0];

    switch (node.type) {
      case 'input.brief':
        return { output: { brief: cfg.text || '' }, note: 'Brief loaded' };

      case 'ai.scriptwriter': {
        const brief = firstUpstream?.brief || cfg.text || '';
        const language = cfg.language || 'ru';
        const targetScenes = cfg.targetScenes || 5;
        const prompt = `Бриф: ${brief}\nЯзык: ${language}\nЖелаемое число сцен: ${targetScenes}\nТон: ${cfg.tone || 'информативный'}`;
        const raw = await this.llm.complete(prompt, SCRIPT_SYSTEM, {
          model: cfg.model || undefined,
          responseFormat: { type: 'json_object' },
        });
        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = { script: raw, scenes: this.splitText(raw, 400) };
        }
        return { output: parsed, note: `Script with ${parsed.scenes?.length || 0} scenes` };
      }

      case 'logic.scene_split': {
        const text = firstUpstream?.script || firstUpstream?.brief || '';
        const scenes = firstUpstream?.scenes?.length
          ? firstUpstream.scenes
          : this.splitText(text, cfg.maxCharsPerScene || 400);
        return { output: { ...firstUpstream, scenes }, note: `${scenes.length} scenes` };
      }

      case 'voice.tts':
        return {
          output: { ...firstUpstream, voiceId: cfg.voiceId },
          note: 'TTS configured (executed via render queue)',
        };

      case 'avatar.render':
        return {
          output: { ...firstUpstream, engine: cfg.engine, avatarId: cfg.avatarId },
          note: `Avatar render via ${cfg.engine || 'heygen'} (executed via render queue)`,
        };

      case 'edit.caption':
      case 'edit.background':
      case 'edit.music':
      case 'edit.transition':
        return { output: { ...firstUpstream, [node.type]: cfg }, note: `${node.type} applied` };

      case 'assemble.timeline':
        return { output: { ...firstUpstream, assemble: cfg }, note: 'Assembly configured (FFmpeg)' };

      case 'output.video':
        return { output: firstUpstream, note: 'Output ready — compile to project to generate' };

      default:
        return { output: firstUpstream, note: `Unknown node type ${node.type}` };
    }
  }

  splitText(text: string, maxChars: number): string[] {
    const sentences = text.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);
    const out: string[] = [];
    let cur = '';
    for (const s of sentences) {
      if ((cur + ' ' + s).trim().length > maxChars && cur) {
        out.push(cur.trim());
        cur = s;
      } else {
        cur = (cur + ' ' + s).trim();
      }
    }
    if (cur) out.push(cur.trim());
    return out;
  }
}
