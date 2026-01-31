import prisma from '../../lib/prisma'

export class SupplierValidationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

export class SuppliersService {
    async list(tenantId: string) {
        return prisma.supplier.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' }
        })
    }

    async create(tenantId: string, input: any) {
        const name = typeof input?.name === 'string' ? input.name.trim() : ''
        if (!name) throw new SupplierValidationError(400, 'Supplier name is required')

        try {
            return await prisma.supplier.create({
                data: {
                    tenantId,
                    name,
                    phone: typeof input?.phone === 'string' ? input.phone.trim() || null : null,
                    email: typeof input?.email === 'string' ? input.email.trim() || null : null,
                    address: typeof input?.address === 'string' ? input.address.trim() || null : null,
                    notes: typeof input?.notes === 'string' ? input.notes.trim() || null : null
                }
            })
        } catch (e: any) {
            if (String(e?.message || '').includes('Supplier_tenantId_name_key')) {
                throw new SupplierValidationError(409, 'Supplier with this name already exists')
            }
            throw e
        }
    }

    async getById(tenantId: string, supplierId: string) {
        return prisma.supplier.findFirst({
            where: { tenantId, id: supplierId }
        })
    }

    async update(tenantId: string, supplierId: string, input: any) {
        const existing = await this.getById(tenantId, supplierId)
        if (!existing) throw new SupplierValidationError(404, 'Supplier not found')

        const name = input?.name !== undefined ? (typeof input.name === 'string' ? input.name.trim() : '') : undefined
        if (name !== undefined && !name) throw new SupplierValidationError(400, 'Supplier name is required')

        try {
            await prisma.supplier.updateMany({
                where: { tenantId, id: supplierId },
                data: {
                    name,
                    phone: input?.phone !== undefined ? (typeof input.phone === 'string' ? input.phone.trim() || null : null) : undefined,
                    email: input?.email !== undefined ? (typeof input.email === 'string' ? input.email.trim() || null : null) : undefined,
                    address: input?.address !== undefined ? (typeof input.address === 'string' ? input.address.trim() || null : null) : undefined,
                    notes: input?.notes !== undefined ? (typeof input.notes === 'string' ? input.notes.trim() || null : null) : undefined
                }
            })
        } catch (e: any) {
            if (String(e?.message || '').includes('Supplier_tenantId_name_key')) {
                throw new SupplierValidationError(409, 'Supplier with this name already exists')
            }
            throw e
        }

        return this.getById(tenantId, supplierId)
    }

    async delete(tenantId: string, supplierId: string) {
        const existing = await this.getById(tenantId, supplierId)
        if (!existing) throw new SupplierValidationError(404, 'Supplier not found')

        await prisma.supplier.deleteMany({ where: { tenantId, id: supplierId } })
        return { success: true }
    }
}

