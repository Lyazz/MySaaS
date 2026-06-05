import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const cashboxes = await prisma.cashbox.findMany();
  console.log('Cashboxes in DB:', cashboxes.length);
  for (const cb of cashboxes) {
    console.log(cb);
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
