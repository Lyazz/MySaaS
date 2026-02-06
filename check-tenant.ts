import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking for tenant "apple"...')
    try {
        const tenant = await prisma.tenant.findUnique({
            where: {
                slug: "apple"
            }
        })
        if (tenant) {
            console.log('Tenant found:', tenant.id, tenant.slug)
        } else {
            console.log('Tenant "apple" NOT found.')
        }
    } catch (e) {
        console.error('Error querying tenant:', e)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })





