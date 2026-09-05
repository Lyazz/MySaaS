import type { ShipmentStatus } from '@prisma/client'

const normalizeStatus = (status: unknown) =>
    String(status ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

export const yalidineStatusToShipmentStatus = (status: unknown): ShipmentStatus => {
    const value = normalizeStatus(status)
    if (!value) return 'PENDING'

    if (value.includes('livre') || value === 'delivered') return 'DELIVERED'
    if (value.includes('retour')) return 'RETURNED'
    if (value.includes('annul') || value === 'cancelled' || value === 'canceled') return 'CANCELLED'
    if (
        value.includes('transfert') ||
        value.includes('expedi') ||
        value.includes('centre') ||
        value.includes('wilaya') ||
        value.includes('livraison') ||
        value.includes('localisation') ||
        value === 'in delivery' ||
        value === 'in_transit'
    ) {
        return 'IN_TRANSIT'
    }
    if (
        value.includes('preparation') ||
        value.includes('ramasse') ||
        value.includes('pret') ||
        value.includes('pas encore') ||
        value === 'confirmed'
    ) {
        return 'REQUESTED'
    }

    return 'PENDING'
}

export const yalidineStatusToLocalOrderStatus = (status: unknown): 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED' | null => {
    const shipmentStatus = yalidineStatusToShipmentStatus(status)
    if (shipmentStatus === 'IN_TRANSIT') return 'SHIPPED'
    if (shipmentStatus === 'DELIVERED') return 'DELIVERED'
    if (shipmentStatus === 'CANCELLED') return 'CANCELLED'
    if (shipmentStatus === 'RETURNED') return 'RETURNED'
    return null
}

