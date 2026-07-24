import prisma from './src/lib/prisma.ts';

async function checkStuckMappings() {
    const errs = await prisma.maystroProductMapping.findMany({ where: { syncStatus: 'ERROR' } });
    console.log('Mappings in ERROR status:', errs);
    await prisma.$disconnect();
}
checkStuckMappings();
