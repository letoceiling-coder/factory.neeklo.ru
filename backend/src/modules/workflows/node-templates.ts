export interface NodeTemplate {
  type: string;
  category: 'INPUT' | 'AI' | 'VOICE' | 'AVATAR' | 'EDIT' | 'ASSEMBLE' | 'OUTPUT';
  label: string;
  description: string;
  defaultConfig?: Record<string, any>;
}

export const NODE_TEMPLATES: NodeTemplate[] = [
  { type: 'input.brief', category: 'INPUT', label: 'Бриф', description: 'Тема/бриф ролика', defaultConfig: { text: '' } },
  {
    type: 'ai.scriptwriter',
    category: 'AI',
    label: 'Сценарист (AI)',
    description: 'Разворачивает бриф в длинный сценарий по сценам',
    defaultConfig: { model: '', tone: 'информативный', targetScenes: 5, language: 'ru' },
  },
  {
    type: 'logic.scene_split',
    category: 'AI',
    label: 'Разбивка на сцены',
    description: 'Делит сценарий на сегменты под лимиты провайдера',
    defaultConfig: { maxCharsPerScene: 400 },
  },
  {
    type: 'voice.tts',
    category: 'VOICE',
    label: 'Озвучка (ElevenLabs)',
    description: 'Реалистичная речь для каждой сцены',
    defaultConfig: { voiceId: '', stability: 0.5, similarityBoost: 0.75 },
  },
  {
    type: 'avatar.render',
    category: 'AVATAR',
    label: 'Рендер аватара',
    description: 'Audio-driven клип с синхроном губ',
    defaultConfig: { engine: 'heygen', avatarId: '' },
  },
  { type: 'edit.caption', category: 'EDIT', label: 'Субтитры', description: 'Выжигание субтитров', defaultConfig: { enabled: true } },
  { type: 'edit.background', category: 'EDIT', label: 'Фон', description: 'Цвет/изображение фона', defaultConfig: { value: '#0a0a0f' } },
  { type: 'edit.music', category: 'EDIT', label: 'Музыка', description: 'Фоновая музыка', defaultConfig: { assetKey: '', volume: 0.15 } },
  { type: 'edit.transition', category: 'EDIT', label: 'Переход', description: 'Переход между сценами', defaultConfig: { kind: 'fade' } },
  {
    type: 'assemble.timeline',
    category: 'ASSEMBLE',
    label: 'Сборка (FFmpeg)',
    description: 'Монтаж клипов в единый таймлайн',
    defaultConfig: { withCaptions: false },
  },
  { type: 'output.video', category: 'OUTPUT', label: 'Готовое видео', description: 'Финальный MP4 в хранилище', defaultConfig: {} },
];

export const CATEGORY_COLORS: Record<string, string> = {
  INPUT: '#10b981',
  AI: '#8b5cf6',
  VOICE: '#06b6d4',
  AVATAR: '#f59e0b',
  EDIT: '#3b82f6',
  ASSEMBLE: '#ec4899',
  OUTPUT: '#f43f5e',
};
