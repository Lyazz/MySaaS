import type { ShipmentStatus } from '@prisma/client'

export const maystroOrderStatusToShipmentStatus = (code: unknown): ShipmentStatus => {
    const n = typeof code === 'string' ? Number.parseInt(code, 10) : typeof code === 'number' ? code : NaN

    // Per Maystro docs status codes:
    // 4=CREATED, 5=PICK_UP_REQUESTED, 6=IN_PROCESS, 8=WAITING_TRANSIT,
    // 9=IN_TRANSIT_TO_BE_SHIPPED, 10=IN_TRANSIT_TO_BE_RETURNED, 11=PENDING,
    // 12=OUT_OF_STOCK, 15=READY_TO_SHIP, 22=ASSIGNED, 31=SHIPPED, 32=ALERTED,
    // 41=DELIVERED, 42=POSTPONED, 50=ABORTED, 51=READY_TO_RETURN,
    // 52=TAKEN_BY_STORE, 53=NOT_RECEIVED
    if (n === 41) return 'DELIVERED'
    if (n === 50) return 'CANCELLED'
    if (n === 10 || n === 51 || n === 52 || n === 53) return 'RETURNED'  // 10=IN_TRANSIT_TO_BE_RETURNED

    if (n === 31 || n === 32 || n === 42) return 'IN_TRANSIT'  // 32=ALERTED, 42=POSTPONED still active
    if (n === 6 || n === 8 || n === 9 || n === 11 || n === 12 || n === 15 || n === 22) return 'CONFIRMED'
    if (n === 4 || n === 5) return 'REQUESTED'

    return 'PENDING'
}

export const maystroOrderStatusToLocalOrderStatus = (code: unknown): 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED' | null => {
    const n = typeof code === 'string' ? Number.parseInt(code, 10) : typeof code === 'number' ? code : NaN
    if (n === 41) return 'DELIVERED'
    if (n === 31) return 'SHIPPED'
    if (n === 50) return 'CANCELLED'
    // 10=IN_TRANSIT_TO_BE_RETURNED, 51=READY_TO_RETURN, 52=TAKEN_BY_STORE, 53=NOT_RECEIVED
    if (n === 10 || n === 51 || n === 52 || n === 53) return 'RETURNED'
    return null
}

export const maystroOrderStatusToString = (code: unknown): string => {
    const n = typeof code === 'string' ? Number.parseInt(code, 10) : typeof code === 'number' ? code : NaN
    const map: Record<number, string> = {
        4: 'CREATED',
        5: 'PICK_UP_REQUESTED',
        6: 'IN_PROCESS',
        8: 'WAITING_TRANSIT',
        9: 'IN_TRANSIT_TO_BE_SHIPPED',
        10: 'IN_TRANSIT_TO_BE_RETURNED',
        11: 'PENDING',
        12: 'OUT_OF_STOCK',
        15: 'READY_TO_SHIP',
        22: 'ASSIGNED',
        31: 'SHIPPED',
        32: 'ALERTED',
        41: 'DELIVERED',
        42: 'POSTPONED',
        50: 'ABORTED',
        51: 'READY_TO_RETURN',
        52: 'TAKEN_BY_STORE',
        53: 'NOT_RECEIVED'
    }
    return map[n] || String(code)
}

