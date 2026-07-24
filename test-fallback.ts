import { MaystroProductMapping, PrismaClient } from '@prisma/client'
import { MaystroOrderService } from './backend/src/modules/delivery/maystro/maystro-order.service'
import { MaystroProductService } from './backend/src/modules/delivery/maystro/maystro-product.service'

const prisma = new PrismaClient()

async function main() {
    const service = new MaystroProductService(prisma)
    
    // Attempt to sync a dummy product to trigger the fallback logic
    try {
        await service.createOrUpdateProduct({
            tenantId: 'dummy-tenant',
            apiToken: 'dummy-token',
            storeId: 'dummy-store',
            localProductId: 'dummy-product-id',
            logisticalDescription: 'dummy-description'
        })
    } catch (err: any) {
        console.log('Caught Error:', err.name, err.message)
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
