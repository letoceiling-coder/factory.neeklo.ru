import { NODE_TEMPLATES } from './node-templates';

export interface PipelineTemplateGraph {
  id: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    type: string;
    category: string;
    label: string;
    positionX: number;
    positionY: number;
    config: Record<string, any>;
  }>;
  edges: Array<{ id: string; source: string; target: string }>;
}

const SAMPLE_BRIEF =
  'Ролик о том, зачем бизнесу нужен искусственный интеллект. ' +
  'Рассказать про автоматизацию рутины, анализ данных, чат-ботов и экономию времени. ' +
  'Тон — дружелюбный эксперт, 5–6 коротких сцен.';

/** Linear pipeline using every node from the palette — for learning and preview runs. */
export const FULL_PIPELINE_TEMPLATE: PipelineTemplateGraph = {
  id: 'full',
  name: 'Полный пайплайн',
  description: 'Все узлы: бриф → сценарий → сцены → озвучка → аватар → монтаж → сборка → выход',
  nodes: [
    {
      id: 'n_brief',
      type: 'input.brief',
      category: 'INPUT',
      label: 'Бриф',
      positionX: 0,
      positionY: 120,
      config: { text: SAMPLE_BRIEF },
    },
    {
      id: 'n_script',
      type: 'ai.scriptwriter',
      category: 'AI',
      label: 'Сценарист (AI)',
      positionX: 240,
      positionY: 120,
      config: { model: '', tone: 'информативный', targetScenes: 6, language: 'ru' },
    },
    {
      id: 'n_split',
      type: 'logic.scene_split',
      category: 'AI',
      label: 'Разбивка на сцены',
      positionX: 480,
      positionY: 120,
      config: { maxCharsPerScene: 350 },
    },
    {
      id: 'n_tts',
      type: 'voice.tts',
      category: 'VOICE',
      label: 'Озвучка (ElevenLabs)',
      positionX: 720,
      positionY: 120,
      config: { voiceId: '', stability: 0.5, similarityBoost: 0.75, style: 0, speed: 1 },
    },
    {
      id: 'n_avatar',
      type: 'avatar.render',
      category: 'AVATAR',
      label: 'Рендер аватара',
      positionX: 960,
      positionY: 120,
      config: { engine: 'heygen', avatarId: '' },
    },
    {
      id: 'n_bg',
      type: 'edit.background',
      category: 'EDIT',
      label: 'Фон',
      positionX: 1200,
      positionY: 40,
      config: { type: 'color', value: '#0a0a0f' },
    },
    {
      id: 'n_caption',
      type: 'edit.caption',
      category: 'EDIT',
      label: 'Субтитры',
      positionX: 1200,
      positionY: 120,
      config: { enabled: true, style: 'bottom' },
    },
    {
      id: 'n_transition',
      type: 'edit.transition',
      category: 'EDIT',
      label: 'Переход',
      positionX: 1200,
      positionY: 200,
      config: { kind: 'fade', durationSec: 0.5 },
    },
    {
      id: 'n_music',
      type: 'edit.music',
      category: 'EDIT',
      label: 'Музыка',
      positionX: 1200,
      positionY: 280,
      config: { assetKey: '', volume: 0.12, enabled: false },
    },
    {
      id: 'n_assemble',
      type: 'assemble.timeline',
      category: 'ASSEMBLE',
      label: 'Сборка (FFmpeg)',
      positionX: 1440,
      positionY: 120,
      config: { withCaptions: true, aspectRatio: '16:9' },
    },
    {
      id: 'n_output',
      type: 'output.video',
      category: 'OUTPUT',
      label: 'Готовое видео',
      positionX: 1680,
      positionY: 120,
      config: { format: 'mp4', quality: 'high' },
    },
  ],
  edges: [
    { id: 'e1', source: 'n_brief', target: 'n_script' },
    { id: 'e2', source: 'n_script', target: 'n_split' },
    { id: 'e3', source: 'n_split', target: 'n_tts' },
    { id: 'e4', source: 'n_tts', target: 'n_avatar' },
    { id: 'e5', source: 'n_avatar', target: 'n_bg' },
    { id: 'e6', source: 'n_bg', target: 'n_caption' },
    { id: 'e7', source: 'n_caption', target: 'n_transition' },
    { id: 'e8', source: 'n_transition', target: 'n_music' },
    { id: 'e9', source: 'n_music', target: 'n_assemble' },
    { id: 'e10', source: 'n_assemble', target: 'n_output' },
  ],
};

export const PIPELINE_TEMPLATES: Record<string, PipelineTemplateGraph> = {
  full: FULL_PIPELINE_TEMPLATE,
};

export function listPipelineTemplates() {
  return Object.values(PIPELINE_TEMPLATES).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    nodeCount: t.nodes.length,
    nodeTypes: t.nodes.map((n) => n.type),
  }));
}

export function buildGraphFromTemplate(templateId: string) {
  const tpl = PIPELINE_TEMPLATES[templateId];
  if (!tpl) return null;
  const defaults = new Map(NODE_TEMPLATES.map((n) => [n.type, n.defaultConfig || {}]));
  return {
    nodes: tpl.nodes.map((n) => ({
      ...n,
      config: { ...defaults.get(n.type), ...n.config },
    })),
    edges: tpl.edges,
  };
}
