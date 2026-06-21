const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.avatar.findMany({ select: { id: true, name: true } }).then((a) => { console.log(JSON.stringify(a)); p.$disconnect(); });
