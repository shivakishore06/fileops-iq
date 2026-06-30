import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  // 1. Fetch our newly registered tenant
  const tenant = await prisma.tenant.findUnique({
    where: { domain: 'acme' },
  });

  if (!tenant) {
    console.error('Tenant "acme" not found. Register a test user first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`Found Tenant ID: ${tenant.id}`);

  // 2. Create the Sandbox Connection
  const connection = await prisma.connection.create({
    data: {
      tenantId: tenant.id,
      name: 'Sandbox Poller',
      type: 'FOLDER',
      status: 'ACTIVE',
      configJson: JSON.stringify({
        path: '/Users/sivakishore/Desktop/AI Project/Tool/backend/sandbox',
      }),
      pollingInterval: 10,
    },
  });

  console.log(`Created Connection: ${connection.name} (ID: ${connection.id})`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
