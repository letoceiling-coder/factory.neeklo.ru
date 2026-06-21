import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@factory.neeklo.ru';
  const password = process.env.ADMIN_PASSWORD || 'admin12345';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { email, password: hash, name: 'Administrator', role: 'admin' } });
    console.log(`Seeded admin: ${email}`);
  } else {
    console.log(`Admin already exists: ${email}`);
  }

  // Seed provider rows (empty keys, filled via env fallback or UI).
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
  console.log('Seeded providers');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
