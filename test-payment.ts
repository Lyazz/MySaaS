import { PrismaClient } from '@prisma/client'
import { OrdersService } from '../../backend/src/modules/orders/orders.service'

const prisma = new PrismaClient()

async function testPayment() {
    console.log('Fetching an order...')
    const order = await prisma.order.findFirst({
        where: { paymentStatus: 'UNPAID' }
    })
    
    if (!order) {
        console.log('No unpaid order found.')
        return
    }

    console.log(`Found order ${order.id} for tenant ${order.tenantId}`)

    // Create a cashbox
    const cashbox = await prisma.cashbox.create({
        data: {
            name: 'Test Cashbox',
            tenantId: order.tenantId,
            isActive: true
        }
    })

    console.log(`Created cashbox ${cashbox.id}`)

    // Create an open session
    const session = await prisma.cashSession.create({
        data: {
            tenantId: order.tenantId,
            cashboxId: cashbox.id,
            openedByUserId: 'test-user',
            openingFloat: 0
        }
    })

    console.log(`Created session ${session.id}`)

    const service = new OrdersService()
    
    try {
        console.log('Recording payment...')
        const result = await service.recordPayment(order.tenantId, 'test-user', order.id, {
            amount: 50,
            method: 'CASH',
            cashboxId: cashbox.id,
            reference: 'TEST-REF',
            note: 'Test payment'
        })
        console.log('Payment recorded successfully:', result)
    } catch (e) {
        console.error('Failed to record payment:', e)
    } finally {
        await prisma.cashSession.delete({ where: { id: session.id } })
        await prisma.cashbox.delete({ where: { id: cashbox.id } })
        await prisma.$disconnect()
    }
}

testPayment()
