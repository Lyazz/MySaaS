import type { Prisma } from '@prisma/client'

type StaffCrudAction = 'create' | 'read' | 'update' | 'delete'

export type StaffRolePreset = {
    name: string
    permissions: Array<{ resource: string; actions: StaffCrudAction[] }>
}

export const STAFF_ROLE_PRESETS: StaffRolePreset[] = [
    {
        name: 'Gestionnaire commandes',
        permissions: [
            { resource: 'dashboard', actions: ['read'] },
            { resource: 'orders', actions: ['read', 'update'] },
            { resource: 'customers', actions: ['read'] },
            { resource: 'delivery', actions: ['read', 'update'] }
        ]
    },
    {
        name: 'Approvisionnement',
        permissions: [
            { resource: 'dashboard', actions: ['read'] },
            { resource: 'purchases', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'suppliers', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'inventory', actions: ['read', 'update'] },
            { resource: 'products', actions: ['read'] },
            { resource: 'categories', actions: ['read'] }
        ]
    },
    {
        name: 'Gestionnaire catalogue',
        permissions: [
            { resource: 'dashboard', actions: ['read'] },
            { resource: 'products', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'categories', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'variants', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'inventory', actions: ['read', 'update'] },
            { resource: 'metaPixels', actions: ['read', 'update'] }
        ]
    },
    {
        name: 'Caisse',
        permissions: [
            { resource: 'dashboard', actions: ['read'] },
            { resource: 'cash', actions: ['create', 'read', 'update'] },
            { resource: 'billing', actions: ['read'] },
            { resource: 'orders', actions: ['read', 'update'] },
            { resource: 'customers', actions: ['read'] }
        ]
    },
    {
        name: 'Lecture seule',
        permissions: [
            { resource: 'dashboard', actions: ['read'] },
            { resource: 'products', actions: ['read'] },
            { resource: 'categories', actions: ['read'] },
            { resource: 'variants', actions: ['read'] },
            { resource: 'inventory', actions: ['read'] },
            { resource: 'orders', actions: ['read'] },
            { resource: 'sales', actions: ['read'] },
            { resource: 'purchases', actions: ['read'] },
            { resource: 'suppliers', actions: ['read'] },
            { resource: 'customers', actions: ['read'] },
            { resource: 'delivery', actions: ['read'] },
            { resource: 'cash', actions: ['read'] },
            { resource: 'billing', actions: ['read'] },
            { resource: 'storeSettings', actions: ['read'] },
            { resource: 'homepageSettings', actions: ['read'] },
            { resource: 'contactInfos', actions: ['read'] },
            { resource: 'integrations', actions: ['read'] },
            { resource: 'metaPixels', actions: ['read'] },
            { resource: 'pos', actions: ['read'] }
        ]
    }
]

const flatten = (preset: StaffRolePreset) =>
    preset.permissions.flatMap((p) => p.actions.map((action) => ({ resource: p.resource, action })))

export const seedStaffRolePresets = async (tx: Prisma.TransactionClient, tenantId: string) => {
    const names = STAFF_ROLE_PRESETS.map((p) => p.name)
    const existing = await tx.tenantStaffRole.findMany({
        where: { tenantId, name: { in: names } },
        select: { id: true, name: true }
    })
    const existingByName = new Map(existing.map((r) => [r.name, r.id]))

    for (const preset of STAFF_ROLE_PRESETS) {
        if (existingByName.has(preset.name)) continue

        const created = await tx.tenantStaffRole.create({
            data: {
                name: preset.name,
                tenant: { connect: { id: tenantId } }
            },
            select: { id: true }
        })

        const perms = flatten(preset)
        if (perms.length) {
            await tx.tenantStaffRolePermission.createMany({
                data: perms.map((p) => ({
                    tenantId,
                    roleId: created.id,
                    resource: p.resource,
                    action: p.action
                })),
                skipDuplicates: true
            })
        }
    }
}

