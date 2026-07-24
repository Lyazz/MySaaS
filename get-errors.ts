import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const mappings = await prisma.maystroOrderMapping.findMany({
        where: { success: false },
        orderBy: { updatedAt: 'desc' },
        take: 3
    })
    
    for (const m of mappings) {
        console.log(`Mapping ${m.localOrderId} (${m.updatedAt}): ${m.lastError}`)
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
