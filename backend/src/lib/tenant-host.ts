export type ParsedHost =
    | { kind: 'saas' }
    | { kind: 'tenant-subdomain'; slug: string }
    | { kind: 'custom-domain'; domain: string }

const DEFAULT_PLATFORM_BASE_DOMAIN = 'platform.com'

const normalizeHostHeader = (rawHostHeader: string): string => {
    const first = rawHostHeader.split(',')[0]?.trim() ?? ''
    if (!first) return ''

    // Handle bracketed IPv6 hosts like: [::1]:3000
    if (first.startsWith('[')) {
        const bracketEnd = first.indexOf(']')
        if (bracketEnd === -1) return first.toLowerCase()
        return first.slice(0, bracketEnd + 1).toLowerCase()
    }

    // Strip :port when present (e.g. localhost:3000)
    const parts = first.split(':')
    const last = parts[parts.length - 1]
    if (parts.length > 1 && /^\d+$/.test(last)) {
        return parts.slice(0, -1).join(':').toLowerCase()
    }

    return first.toLowerCase()
}

const isValidSlug = (slug: string): boolean => /^[a-z0-9-]+$/.test(slug)

export const parseHost = (
    rawHostHeader: string,
    opts?: { platformBaseDomain?: string }
): ParsedHost => {
    const platformBaseDomain = (opts?.platformBaseDomain ?? DEFAULT_PLATFORM_BASE_DOMAIN).toLowerCase()
    const host = normalizeHostHeader(rawHostHeader)

    if (!host) return { kind: 'saas' }

    // SaaS roots (no tenant context)
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return { kind: 'saas' }
    if (host === platformBaseDomain || host === `www.${platformBaseDomain}`) return { kind: 'saas' }
    // Plain IPv4 hosts (LAN dev): treat as SaaS so landing/login work via IP
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return { kind: 'saas' }

    // Local dev: {slug}.localhost
    if (host.endsWith('.localhost')) {
        const slug = host.slice(0, -'.localhost'.length).split('.')[0] ?? ''
        if (slug && slug !== 'www' && isValidSlug(slug)) return { kind: 'tenant-subdomain', slug }
        return { kind: 'saas' }
    }

    // Dev on LAN: nip.io wildcard
    // Tenant form: {slug}.{ip}.nip.io => slug derived from first label
    // IP-only form: {ip}.nip.io => SaaS/root
    if (host.endsWith('.nip.io')) {
        const nipRegex = /^([a-z0-9-]+)\.(\d{1,3}(?:\.\d{1,3}){3})\.nip\.io$/
        const ipOnlyRegex = /^(\d{1,3}(?:\.\d{1,3}){3})\.nip\.io$/
        const nipTenantMatch = host.match(nipRegex)
        if (nipTenantMatch) {
            const slug = nipTenantMatch[1]
            if (slug && slug !== 'www' && isValidSlug(slug)) return { kind: 'tenant-subdomain', slug }
            return { kind: 'saas' }
        }
        if (ipOnlyRegex.test(host)) return { kind: 'saas' }
        return { kind: 'saas' }
    }

    // Production: {slug}.{platformBaseDomain}
    if (host.endsWith(`.${platformBaseDomain}`)) {
        const left = host.slice(0, -(`.${platformBaseDomain}`.length))
        const slug = left.split('.')[0] ?? ''
        if (slug && slug !== 'www' && isValidSlug(slug)) return { kind: 'tenant-subdomain', slug }
        return { kind: 'saas' }
    }

    // Custom domain: resolve via TenantDomain mapping table.
    if (host.includes('.')) return { kind: 'custom-domain', domain: host }
    return { kind: 'saas' }
}
