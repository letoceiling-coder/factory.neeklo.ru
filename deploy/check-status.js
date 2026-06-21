const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const jobs = await p.renderJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { type: true, status: true, error: true, progress: true, sceneId: true },
  });
  console.log('JOBS:', JSON.stringify(jobs, null, 2));

  const avatars = await p.avatar.findMany({
    select: { name: true, engine: true, engineAvatarId: true, sourceImageKey: true, kind: true },
  });
  console.log('AVATARS:', JSON.stringify(avatars, null, 2));

  const scenes = await p.scene.findMany({
    where: { projectId: '74c0c798-5794-4055-b481-cce3defaed14' },
    orderBy: { order: 'asc' },
    select: { order: true, status: true, audioKey: true, clipKey: true },
  });
  console.log('SCENES:', JSON.stringify(scenes, null, 2));

  const provider = await p.provider.findUnique({ where: { slug: 'heygen' }, select: { slug: true, enabled: true } });
  console.log('HEYGEN_PROVIDER:', provider);

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
