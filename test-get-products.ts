import { PrismaClient } from '@prisma/client'
import { MaystroClient } from './backend/src/modules/delivery/maystro/maystro.client'

const prisma = new PrismaClient()

async function main() {
    // Find the Maystro token from whatever table it is in
    const configs: any[] = await prisma.$queryRaw`SELECT * FROM "StoreIntegration" WHERE provider = 'MAYSTRO' LIMIT 1;`
    
    if (!configs || configs.length === 0) {
        console.log('No Maystro config found in StoreIntegration, trying another table...')
        const deliveryConfigs: any[] = await prisma.$queryRaw`SELECT * FROM "DeliveryIntegration" WHERE provider = 'MAYSTRO' LIMIT 1;`
        if (deliveryConfigs && deliveryConfigs.length > 0) {
            console.log('Found in DeliveryIntegration')
            configs.push(deliveryConfigs[0])
        }
    }

    // Let's just query any table that might have apiToken
    const anyTable: any[] = await prisma.$queryRaw`SELECT api_token, store_id FROM "Tenant" WHERE api_token IS NOT NULL LIMIT 1;`.catch(() => [])

    console.log('Configs:', configs)
}

main().catch(console.error).finally(() => prisma.$disconnect())
