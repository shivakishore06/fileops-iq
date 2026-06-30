import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  const connections = await prisma.connection.findMany({
    where: { deletedAt: null },
  });

  const files = await prisma.file.findMany({
    where: { deletedAt: null },
  });

  const alerts = await prisma.alert.findMany({
    where: { deletedAt: null },
  });

  console.log('--- CONNECTIONS ---');
  console.log(connections.map(c => ({ id: c.id, name: c.name, status: c.status, lastCheckedAt: c.lastCheckedAt })));

  console.log('--- FILES ---');
  console.log(files.map(f => ({ id: f.id, filename: f.filename, status: f.status, receivedAt: f.receivedAt })));

  console.log('--- ALERTS ---');
  console.log(alerts.map(a => ({ id: a.id, title: a.title, status: a.status })));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
