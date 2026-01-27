import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TENANT_ID = 'f74cf864-f4cc-41af-8988-c536466e5d95'

async function main() {
    console.log('Restoring Apple Tenant...')

    const tenant = await prisma.tenant.upsert({
        where: { id: TENANT_ID },
        update: {},
        create: {
            id: TENANT_ID,
            slug: 'apple',
            name: 'Apple Store',
            isSuspended: false,
            domains: {
                create: {
                    domain: 'apple.localhost'
                }
            }
        }
    })

    console.log(`Tenant restored: ${tenant.name} (${tenant.id})`)

    // Also ensure StoreSettings exist
    await prisma.storeSettings.upsert({
        where: { tenantId: TENANT_ID },
        update: {},
        create: {
            tenantId: TENANT_ID,
            primaryColor: '#0d9488',
            templateKey: 'modern',
            fontFamily: 'Outfit',
            language: 'en'
        }
    })
    console.log('Store settings restored.')

}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
