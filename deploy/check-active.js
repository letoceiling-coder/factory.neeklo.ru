const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const active = await p.renderJob.findMany({
    where: { status: { in: ['queued', 'active'] } },
    select: { type: true, status: true, sceneId: true, createdAt: true },
  });
  console.log('ACTIVE_JOBS:', JSON.stringify(active, null, 2));

  const project = await p.videoProject.findUnique({
    where: { id: '74c0c798-5794-4055-b481-cce3defaed14' },
    select: { status: true, updatedAt: true },
  });
  console.log('PROJECT:', project);

  await p.$disconnect();
})();
