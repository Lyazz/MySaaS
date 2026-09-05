import crypto from 'crypto'
import prisma from '../../lib/prisma'

/**
 * The single-use secret behind every customer-facing confirmation link.
 *
 * It lives here rather than on `OrdersService` because the WhatsApp sender needs
 * it too, and `OrdersService` already pulls in delivery, loyalty and cash — a
 * cycle waiting to happen. The rule it encodes is unchanged: an order keeps the
 * same token until that token is spent, so a resent message and the first one
 * confirm the same order rather than racing each other.
 */
export const ensureOrderConfirmationToken = async (tenantId: string, orderId: string): Promise<string> => {
    const order = await prisma.order.findUnique({
        where: { tenantId, id: orderId }
    })
    if (!order) throw new Error('Order not found')

    if (order.confirmationToken && !order.confirmationTokenUsed) {
        return order.confirmationToken
    }

    const token = crypto.randomBytes(32).toString('hex')
    await prisma.order.update({
        where: { id: orderId },
        data: {
            confirmationToken: token,
            confirmationTokenUsed: false
        }
    })
    return token
}
