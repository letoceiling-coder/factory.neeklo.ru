const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const PROJECT_ID = '74c0c798-5794-4055-b481-cce3defaed14';
const RINA_TALKING_PHOTO = 'b1dfebbc92a34935a3373e7ac421b6a1';

(async () => {
  await p.avatar.updateMany({
    where: { name: 'rina', engineAvatarId: null },
    data: { engineAvatarId: RINA_TALKING_PHOTO },
  });

  await p.scene.updateMany({
    where: { projectId: PROJECT_ID, status: 'rendering' },
    data: { status: 'failed' },
  });

  await p.videoProject.update({
    where: { id: PROJECT_ID },
    data: { status: 'failed' },
  });

  console.log('Fixed: rina talking_photo_id saved, project marked failed');
  await p.$disconnect();
})();
