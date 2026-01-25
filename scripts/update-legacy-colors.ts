
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const oldDefault = '#4F46E5'
    const newDefault = '#0d9488'

    const count = await prisma.storeSettings.count({
        where: { primaryColor: oldDefault }
    })

    console.log(`Found ${count} store settings with legacy color ${oldDefault}`)

    if (count > 0) {
        const updated = await prisma.storeSettings.updateMany({
            where: { primaryColor: oldDefault },
            data: { primaryColor: newDefault }
        })
        console.log(`Updated ${updated.count} records to ${newDefault}`)
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
