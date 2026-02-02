import prisma from '../../lib/prisma'
import {
    CONTACT_INFO_DEF_BY_KIND,
    buildContactInfoHref,
    isContactInfoKind,
    type ContactInfoKind
} from '../../../../shared/contact-infos'

export class ContactInfosValidationError extends Error {
    statusCode = 400
    statusMessage: string

    constructor(statusMessage: string) {
        super(statusMessage)
        this.statusMessage = statusMessage
    }
}

export class ContactInfosNotFoundError extends Error {
    statusCode = 404
    statusMessage: string

    constructor(statusMessage: string) {
        super(statusMessage)
        this.statusMessage = statusMessage
    }
}

export type TenantContactInfoDto = {
    id: string
    tenantId: string
    kind: ContactInfoKind
    label: string | null
    value: string
    position: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    iconName: string
    href: string | null
}

export type CreateTenantContactInfoInput = {
    kind: ContactInfoKind
    label?: string | null
    value: string
    position?: number
    isActive?: boolean
}

export type UpdateTenantContactInfoInput = Partial<CreateTenantContactInfoInput>

const toDto = (row: any): TenantContactInfoDto => {
    const kind = row.kind as ContactInfoKind
    const def = CONTACT_INFO_DEF_BY_KIND[kind]
    return {
        id: row.id,
        tenantId: row.tenantId,
        kind,
        label: row.label ?? null,
        value: row.value,
        position: row.position,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        iconName: def.iconName,
        href: buildContactInfoHref(kind, row.value)
    }
}

const validateKind = (value: unknown): ContactInfoKind => {
    if (!isContactInfoKind(value)) throw new ContactInfosValidationError('kind is invalid')
    return value
}

const validateLabel = (value: unknown): string | null => {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') throw new ContactInfosValidationError('label must be a string')
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.length > 80) throw new ContactInfosValidationError('label is too long (max 80 chars)')
    return trimmed
}

const validateValue = (value: unknown): string => {
    if (typeof value !== 'string') throw new ContactInfosValidationError('value must be a string')
    const trimmed = value.trim()
    if (!trimmed) throw new ContactInfosValidationError('value is required')
    if (trimmed.length > 500) throw new ContactInfosValidationError('value is too long (max 500 chars)')
    return trimmed
}

const validatePosition = (value: unknown): number | undefined => {
    if (value === undefined) return undefined
    if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
        throw new ContactInfosValidationError('position must be a non-negative integer')
    }
    return value
}

const validateIsActive = (value: unknown): boolean | undefined => {
    if (value === undefined) return undefined
    if (typeof value !== 'boolean') throw new ContactInfosValidationError('isActive must be a boolean')
    return value
}

export class ContactInfosService {
    async listAdmin(tenantId: string): Promise<TenantContactInfoDto[]> {
        const rows = await prisma.tenantContactInfo.findMany({
            where: { tenantId },
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
        })

        return rows.map(toDto)
    }

    async listPublic(tenantId: string): Promise<TenantContactInfoDto[]> {
        const rows = await prisma.tenantContactInfo.findMany({
            where: { tenantId, isActive: true },
            orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
        })

        return rows.map(toDto)
    }

    async create(tenantId: string, input: CreateTenantContactInfoInput): Promise<TenantContactInfoDto> {
        const kind = validateKind(input.kind)
        const label = validateLabel(input.label)
        const value = validateValue(input.value)
        const isActive = validateIsActive(input.isActive) ?? true
        const position = validatePosition(input.position)

        const resolvedPosition =
            position ??
            (await prisma.tenantContactInfo
                .aggregate({ where: { tenantId }, _max: { position: true } })
                .then((r) => (r._max.position ?? -1) + 1))

        const created = await prisma.tenantContactInfo.create({
            data: { tenantId, kind, label, value, isActive, position: resolvedPosition }
        })

        return toDto(created)
    }

    async update(tenantId: string, id: string, input: UpdateTenantContactInfoInput): Promise<TenantContactInfoDto> {
        const data: any = {}

        if (input.kind !== undefined) data.kind = validateKind(input.kind)
        if (input.label !== undefined) data.label = validateLabel(input.label)
        if (input.value !== undefined) data.value = validateValue(input.value)
        if (input.position !== undefined) data.position = validatePosition(input.position)
        if (input.isActive !== undefined) data.isActive = validateIsActive(input.isActive)

        const updated = await prisma.tenantContactInfo
            .update({
                where: { tenantId_id: { tenantId, id } },
                data
            })
            .catch((e) => {
                if ((e as any)?.code === 'P2025') {
                    throw new ContactInfosNotFoundError('Contact info not found')
                }
                throw e
            })

        return toDto(updated)
    }

    async remove(tenantId: string, id: string): Promise<void> {
        await prisma.tenantContactInfo.delete({ where: { tenantId_id: { tenantId, id } } }).catch((e) => {
            if ((e as any)?.code === 'P2025') {
                throw new ContactInfosNotFoundError('Contact info not found')
            }
            throw e
        })
    }
}
