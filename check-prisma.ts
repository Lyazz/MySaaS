import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking Prisma Client Models...')
    console.log('prisma.product exists:', !!prisma.product)
    console.log('prisma.category exists:', !!prisma.category)
    console.log('prisma.variant exists:', !!prisma.variant)
    console.log('prisma.user exists:', !!prisma.user)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
