import { PrismaClient } from '@prisma/client'
import { DeliveryService } from './backend/src/modules/delivery/delivery.service'

const prisma = new PrismaClient()
const deliveryService = new DeliveryService(prisma)

async function main() {
    const orderId = '4d307f7d-9ef5-4513-ab67-111d86f66fa3'
    const order = await prisma.order.findUnique({
        where: { id: orderId }
    })
    
    if (!order) {
        console.log('Order not found')
        return
    }

    try {
        console.log('Pushing to Maystro with invalid data...')
        await deliveryService.createShipment({
            tenantId: order.tenantId,
            provider: 'MAYSTRO',
            orderId: order.id,
            contactName: order.customerName ?? '',
            contactPhone: order.customerPhone ?? '',
            wilayaCode: '99', // INVALID WILAYA
            communeCode: order.shippingCommuneCode ?? undefined,
            addressLine1: order.shippingAddressLine1 ?? order.customerAddress ?? '',
            addressLine2: undefined,
            notes: order.shippingNotes ?? undefined,
            deliveryMode: order.deliveryMode === 'pickup' ? 'office' : 'home',
            metadata: order.shippingPickupPoint
                ? { pickupPoint: order.shippingPickupPoint, maystroDeliveryType: 3 }
                : undefined
        })
    } catch (err: any) {
        console.log('Caught Error Class:', err.constructor.name)
        console.log('err.message:', err.message)
        console.log('err.statusMessage:', err.statusMessage)
        console.log('err.code:', err.code)
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
