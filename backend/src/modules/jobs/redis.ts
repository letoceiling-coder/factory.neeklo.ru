/**
 * BullMQ connection options derived from REDIS_URL.
 * We pass options (not an ioredis instance) so BullMQ uses its own bundled
 * ioredis, avoiding dual-package type conflicts.
 */
export function getRedisConnection(): any {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    db: parsed.pathname && parsed.pathname.length > 1 ? parseInt(parsed.pathname.slice(1), 10) : 0,
    maxRetriesPerRequest: null,
  };
}

export const QUEUE_TTS = 'tts';
export const QUEUE_AVATAR = 'avatar';
export const QUEUE_ASSEMBLE = 'assemble';
