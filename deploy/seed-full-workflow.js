const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Inline minimal template (same ids as pipeline-templates.ts)
const SAMPLE_BRIEF =
  'Ролик о том, зачем бизнесу нужен искусственный интеллект. Рассказать про автоматизацию, анализ данных, чат-ботов и экономию времени.';

const nodes = [
  { id: 'n_brief', type: 'input.brief', category: 'INPUT', label: 'Бриф', positionX: 0, positionY: 120, config: { text: SAMPLE_BRIEF } },
  { id: 'n_script', type: 'ai.scriptwriter', category: 'AI', label: 'Сценарист (AI)', positionX: 240, positionY: 120, config: { tone: 'информативный', targetScenes: 6, language: 'ru', model: '' } },
  { id: 'n_split', type: 'logic.scene_split', category: 'AI', label: 'Разбивка на сцены', positionX: 480, positionY: 120, config: { maxCharsPerScene: 350 } },
  { id: 'n_tts', type: 'voice.tts', category: 'VOICE', label: 'Озвучка (ElevenLabs)', positionX: 720, positionY: 120, config: { voiceId: '', stability: 0.5, similarityBoost: 0.75, speed: 1 } },
  { id: 'n_avatar', type: 'avatar.render', category: 'AVATAR', label: 'Рендер аватара', positionX: 960, positionY: 120, config: { engine: 'heygen', avatarId: '' } },
  { id: 'n_bg', type: 'edit.background', category: 'EDIT', label: 'Фон', positionX: 1200, positionY: 40, config: { type: 'color', value: '#0a0a0f' } },
  { id: 'n_caption', type: 'edit.caption', category: 'EDIT', label: 'Субтитры', positionX: 1200, positionY: 120, config: { enabled: true, style: 'bottom' } },
  { id: 'n_transition', type: 'edit.transition', category: 'EDIT', label: 'Переход', positionX: 1200, positionY: 200, config: { kind: 'fade', durationSec: 0.5 } },
  { id: 'n_music', type: 'edit.music', category: 'EDIT', label: 'Музыка', positionX: 1200, positionY: 280, config: { enabled: false, assetKey: '', volume: 0.12 } },
  { id: 'n_assemble', type: 'assemble.timeline', category: 'ASSEMBLE', label: 'Сборка (FFmpeg)', positionX: 1440, positionY: 120, config: { withCaptions: true, aspectRatio: '16:9' } },
  { id: 'n_output', type: 'output.video', category: 'OUTPUT', label: 'Готовое видео', positionX: 1680, positionY: 120, config: { format: 'mp4', quality: 'high' } },
];

const edges = [
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
];

(async () => {
  let wf = await p.nodeWorkflow.findFirst({ where: { name: 'test' } });
  if (!wf) {
    wf = await p.nodeWorkflow.create({
      data: { name: 'Полный пайплайн', description: 'Все 11 узлов — демо цепочка' },
    });
  } else {
    await p.nodeWorkflow.update({
      where: { id: wf.id },
      data: { name: 'Полный пайплайн', description: 'Все 11 узлов — демо цепочка' },
    });
  }
  await p.node.deleteMany({ where: { workflowId: wf.id } });
  await p.nodeEdge.deleteMany({ where: { workflowId: wf.id } });
  await p.node.createMany({
    data: nodes.map((n) => ({ ...n, workflowId: wf.id, config: n.config })),
  });
  await p.nodeEdge.createMany({
    data: edges.map((e) => ({ ...e, workflowId: wf.id })),
  });
  console.log('OK workflow', wf.id, 'nodes', nodes.length);
  await p.$disconnect();
})();
