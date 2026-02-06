import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Prisma keys:', Object.keys(prisma))
    // Also try to access it specifically
    // @ts-ignore
    console.log('prisma.tenantMetaPixel:', !!prisma.tenantMetaPixel)
    // @ts-ignore
    console.log('prisma.tenantMetaPixels:', !!prisma.tenantMetaPixels)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
