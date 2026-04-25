import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const findProjectRoot = () => {
    let current = process.cwd()

    for (;;) {
        const hasSchema = fs.existsSync(path.join(current, 'prisma', 'schema.prisma'))
        const hasPackageJson = fs.existsSync(path.join(current, 'package.json'))
        const hasBackendSources = fs.existsSync(path.join(current, 'backend', 'src', 'app.ts'))

        if (hasSchema && hasPackageJson && hasBackendSources) return current
        const parent = path.dirname(current)
        if (parent === current) return process.cwd()
        current = parent
    }
}

// Nuxt test builds run the Express app inside a Nitro output directory.
// Ensure Prisma loads from the real project root where `prisma generate` was run.
const projectRoot = findProjectRoot()
const requireFromRoot = createRequire(path.join(projectRoot, 'package.json'))
const prismaPkg = requireFromRoot(
    path.join(projectRoot, 'node_modules', '.prisma', 'client', 'default.js')
) as typeof import('@prisma/client')
const { PrismaClient } = prismaPkg

const prisma = new PrismaClient()

export default prisma

export const getTenantPrisma = (tenant: { id: string }) => {
    if (!tenant) {
        throw new Error('Unauthorized: No tenant context found')
    }

    return prisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    // Models that require tenant isolation
                    const tenantModels = [
                        'AuditLog',
                        'BillingPayment',
                        'Category',
                        'Customer',
                        'CustomerPayment',
                        'CustomerPointsLedger',
                        'DeliveryRate',
                        'InventoryMovement',
                        'MaystroInventoryEvent',
                        'MaystroOrderMapping',
                        'MaystroProductMapping',
                        'Order',
                        'OrderItem',
                        'Product',
                        'ProductBundleDeal',
                        'ProductImage',
                        'ProductOption',
                        'ProductOptionValue',
                        'ProductVariant',
                        'ProductVariantImage',
                        'ProductVariantOptionValue',
                        'PurchaseOrder',
                        'PurchaseOrderItem',
                        'Supplier',
                        'Shipment',
                        'ShipmentEvent',
                        'Sale',
                        'SaleItem',
                        'StoreSettings',
                        'TenantDomain',
                        'TenantDeliveryAccount',
                        'TenantSubscription',
                        'TenantStaffRole',
                        'TenantStaffRolePermission',
                        'User'
                    ]

                    if (tenantModels.includes(model)) {
                        const safeArgs = args as any

                        // For creates, auto-inject tenantId
                        if (operation === 'create') {
                            if (!safeArgs.data) safeArgs.data = {}
                            safeArgs.data.tenantId = tenant.id
                        }
                        if (operation === 'createMany') {
                            if (safeArgs.data) {
                                if (Array.isArray(safeArgs.data)) {
                                    safeArgs.data.forEach((d: any) => d.tenantId = tenant.id)
                                } else {
                                    safeArgs.data.tenantId = tenant.id
                                }
                            }
                        }

                        // For reads/updates/deletes
                        if (['findUnique', 'findFirst', 'findMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {

                            // For simple reads, filtering is enough
                            if (operation === 'findUnique') {
                                // Convert findUnique to findFirst to support extra filter
                                // We cast prisma to any to avoid complex type lookup issues for dynamic model access
                                return (prisma as any)[model].findFirst({
                                    ...safeArgs,
                                    where: { ...safeArgs.where, tenantId: tenant.id }
                                })
                            }

                            // For modifying operations that need unique ID, verify ownership first
                            if (operation === 'update' || operation === 'delete') {
                                // Check if resource exists for this tenant
                                const target = await (prisma as any)[model].findFirst({
                                    where: { ...safeArgs.where, tenantId: tenant.id },
                                    select: { id: true }
                                })

                                if (!target) {
                                    // Return a "Not Found" error consistent with Prisma
                                    throw new Error('Record to update not found or access denied.')
                                }
                                // Proceed with original query (which uses the unique ID from where)
                                return query(args)
                            }

                            // For other operations (findMany, updateMany, etc), just merge where
                            if (!safeArgs.where) safeArgs.where = {}
                            safeArgs.where.tenantId = tenant.id
                        }
                    }
                    return query(args)
                }
            }
        }
    })
}
