import type { ShipmentStatus } from '@prisma/client'

export const maystroOrderStatusToShipmentStatus = (code: unknown): ShipmentStatus => {
    const n = typeof code === 'string' ? Number.parseInt(code, 10) : typeof code === 'number' ? code : NaN

    if (n === 41) return 'DELIVERED'
    if (n === 50) return 'CANCELLED'
    if (n === 51 || n === 52 || n === 53 || n === 10) return 'RETURNED'

    if (n === 31) return 'IN_TRANSIT'
    if (n === 22 || n === 15 || n === 12 || n === 11 || n === 10 || n === 9 || n === 8) return 'CONFIRMED'
    if (n === 6) return 'CONFIRMED'
    if (n === 5 || n === 4) return 'REQUESTED'

    return 'PENDING'
}

export const maystroOrderStatusToLocalOrderStatus = (code: unknown): 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | null => {
    const n = typeof code === 'string' ? Number.parseInt(code, 10) : typeof code === 'number' ? code : NaN
    if (n === 41) return 'DELIVERED'
    if (n === 31) return 'SHIPPED'
    if (n === 50) return 'CANCELLED'
    return null
}

