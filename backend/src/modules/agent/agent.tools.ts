export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiresConfirmation?: boolean;
}

export const AGENT_TOOLS: ToolDef[] = [
  {
    name: 'list_avatars',
    description: 'Список доступных аватаров (id, имя, движок).',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_voices',
    description: 'Список сохранённых голосовых профилей.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'list_projects',
    description: 'Список видеопроектов.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'create_video_project',
    description: 'Создать новый видеопроект.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        brief: { type: 'string', description: 'Тема/бриф ролика' },
        language: { type: 'string', enum: ['ru', 'en'] },
        aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1'] },
      },
      required: ['title', 'brief'],
    },
  },
  {
    name: 'generate_script',
    description: 'Сгенерировать сценарий и сцены для проекта по брифу.',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        targetScenes: { type: 'number' },
        tone: { type: 'string' },
        avatarId: { type: 'string', description: 'Аватар по умолчанию для всех сцен' },
        voiceId: { type: 'string', description: 'Голос по умолчанию для всех сцен' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_project',
    description: 'Получить проект со сценами и статусами.',
    parameters: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
  {
    name: 'start_generation',
    description: 'Запустить полную генерацию ролика (озвучка + аватар + сборка). Затратная операция.',
    parameters: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
    requiresConfirmation: true,
  },
  {
    name: 'get_job_status',
    description: 'Статус задач рендера по проекту.',
    parameters: { type: 'object', properties: { projectId: { type: 'string' } }, required: ['projectId'] },
  },
];

export const AGENT_SYSTEM = `Ты — AI-оператор платформы Factory: завода по производству видеороликов с реалистичным говорящим аватаром.
Ты управляешь платформой через инструменты. Помогай пользователю: создавай проекты, генерируй сценарии, назначай аватаров и голоса, запускай генерацию и отслеживай задачи.
Перед затратными операциями (start_generation) система запросит подтверждение пользователя — это нормально.
Отвечай кратко и по делу на языке пользователя (по умолчанию русский). Всегда показывай ключевые id и статусы.`;
