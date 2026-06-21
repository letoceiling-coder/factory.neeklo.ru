import { INestApplicationContext, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from './prisma/prisma.service';

/**
 * Idempotent seeding executed on application boot so that production
 * deployments always have an admin account and the default provider rows
 * without requiring a separate (dev-only) ts-node seed step.
 *
 * Controlled via SEED_ON_BOOT (default: enabled). Failures are logged but
 * never crash the API process.
 */
export async function ensureSeed(app: INestApplicationContext): Promise<void> {
  if (process.env.SEED_ON_BOOT === 'false') return;

  const logger = new Logger('Seed');
  const prisma = app.get(PrismaService);

  try {
    const email = process.env.ADMIN_EMAIL || 'admin@factory.neeklo.ru';
    const password = process.env.ADMIN_PASSWORD || 'admin12345';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const hash = await bcrypt.hash(password, 10);
      await prisma.user.create({
        data: { email, password: hash, name: 'Administrator', role: 'admin' },
      });
      logger.log(`Seeded admin user: ${email}`);
    }

    const providers = [
      { slug: 'openrouter', type: 'llm', label: 'OpenRouter' },
      { slug: 'elevenlabs', type: 'tts', label: 'ElevenLabs' },
      { slug: 'heygen', type: 'avatar', label: 'HeyGen' },
      { slug: 'hedra', type: 'avatar', label: 'Hedra' },
      { slug: 'did', type: 'avatar', label: 'D-ID' },
      { slug: 'selectel', type: 'storage', label: 'Selectel S3' },
    ] as const;

    for (const p of providers) {
      await prisma.provider.upsert({
        where: { slug: p.slug },
        create: { slug: p.slug, type: p.type as any, label: p.label, enabled: true },
        update: {},
      });
    }
    logger.log('Ensured default provider rows');
  } catch (err) {
    logger.error(`Boot seed skipped due to error: ${(err as Error).message}`);
  }
}
