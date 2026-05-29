import prisma from '../../lib/prisma'

export class CustomDomainError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusCode: number, statusMessage: string) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
    }
}

export type TenantDomainDto = {
    id: string
    domain: string
    cnameTarget: string
    createdAt: Date
    updatedAt: Date
}

const platformBaseDomain = (): string =>
    (process.env.PLATFORM_BASE_DOMAIN || process.env.NUXT_PUBLIC_PLATFORM_BASE_DOMAIN || 'swekly.com')
        .trim()
        .toLowerCase()

const stripProtocol = (value: string): string => value.replace(/^https?:\/\//i, '')

const normalizeDomain = (raw: unknown): string => {
    if (typeof raw !== 'string') {
        throw new CustomDomainError(400, 'Domain is required')
    }

    const withoutProtocol = stripProtocol(raw.trim().toLowerCase())
    const withoutPath = withoutProtocol.split('/')[0] ?? ''
    const withoutTrailingDot = withoutPath.replace(/\.$/, '')
    const withoutPort = withoutTrailingDot.replace(/:\d+$/, '')
    return withoutPort
}

const isValidHostname = (domain: string): boolean => {
    if (!domain || domain.length > 253) return false
    if (!domain.includes('.')) return false
    if (domain === 'localhost') return false
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(domain)) return false
    if (domain.includes('*')) return false

    return domain.split('.').every((label) => {
        if (!label || label.length > 63) return false
        return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    })
}

const isUniqueConstraintError = (error: unknown): boolean =>
    typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002'

export class CustomDomainsService {
    buildCnameTarget(tenantSlug: string): string {
        return `${tenantSlug}.${platformBaseDomain()}`
    }

    toDto(domain: { id: string; domain: string; createdAt: Date; updatedAt: Date }, tenantSlug: string): TenantDomainDto {
        return {
            id: domain.id,
            domain: domain.domain,
            cnameTarget: this.buildCnameTarget(tenantSlug),
            createdAt: domain.createdAt,
            updatedAt: domain.updatedAt
        }
    }

    async list(tenantId: string, tenantSlug: string): Promise<TenantDomainDto[]> {
        const domains = await prisma.tenantDomain.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'asc' }
        })

        return domains.map((domain) => this.toDto(domain, tenantSlug))
    }

    async create(tenantId: string, tenantSlug: string, input: { domain?: unknown }): Promise<TenantDomainDto> {
        const domain = normalizeDomain(input.domain)
        if (!isValidHostname(domain)) {
            throw new CustomDomainError(400, 'Enter a valid domain name, for example www.example.com')
        }

        const baseDomain = platformBaseDomain()
        if (domain === baseDomain || domain.endsWith(`.${baseDomain}`)) {
            throw new CustomDomainError(400, 'Platform domains cannot be added as custom domains')
        }

        const existing = await prisma.tenantDomain.findFirst({ where: { domain, tenantId } })
        if (existing) {
            return this.toDto(existing, tenantSlug)
        }

        try {
            const created = await prisma.tenantDomain.create({
                data: { tenantId, domain }
            })

            return this.toDto(created, tenantSlug)
        } catch (error) {
            if (isUniqueConstraintError(error)) {
                throw new CustomDomainError(409, 'This domain is already connected to another store')
            }
            throw error
        }
    }

    async delete(tenantId: string, id: string): Promise<void> {
        const result = await prisma.tenantDomain.deleteMany({ where: { id, tenantId } })

        if (result.count === 0) {
            throw new CustomDomainError(404, 'Domain not found')
        }
    }
}
