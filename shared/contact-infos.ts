export const CONTACT_INFO_KINDS = [
    'phone',
    'email',
    'address',
    'map',
    'website',
    'whatsapp',
    'facebook',
    'instagram',
    'tiktok',
    'youtube',
    'x',
    'linkedin',
    'snapchat',
    'telegram',
    'viber',
    'pinterest',
    'threads'
] as const

export type ContactInfoKind = (typeof CONTACT_INFO_KINDS)[number]

export type ContactInfoCategory = 'primary' | 'social' | 'other'

export type ContactInfoKindDef = {
    kind: ContactInfoKind
    label: string
    category: ContactInfoCategory
    iconName: string
    placeholder: string
}

export const CONTACT_INFO_KIND_DEFS: ContactInfoKindDef[] = [
    { kind: 'phone', label: 'Phone', category: 'primary', iconName: 'lucide:phone', placeholder: '0550 00 00 00' },
    {
        kind: 'email',
        label: 'Email',
        category: 'primary',
        iconName: 'lucide:mail',
        placeholder: 'contact@store.com'
    },
    {
        kind: 'address',
        label: 'Location / Address',
        category: 'primary',
        iconName: 'lucide:map-pin',
        placeholder: 'Alger, Hydra…'
    },
    {
        kind: 'map',
        label: 'Map Link',
        category: 'other',
        iconName: 'lucide:map',
        placeholder: 'https://maps.app.goo.gl/...'
    },
    {
        kind: 'website',
        label: 'Website',
        category: 'other',
        iconName: 'lucide:globe',
        placeholder: 'https://example.com'
    },

    { kind: 'whatsapp', label: 'WhatsApp', category: 'social', iconName: 'simple-icons:whatsapp', placeholder: '+213550000000' },
    { kind: 'facebook', label: 'Facebook', category: 'social', iconName: 'simple-icons:facebook', placeholder: 'https://facebook.com/yourpage' },
    {
        kind: 'instagram',
        label: 'Instagram',
        category: 'social',
        iconName: 'simple-icons:instagram',
        placeholder: '@yourstore'
    },
    { kind: 'tiktok', label: 'TikTok', category: 'social', iconName: 'simple-icons:tiktok', placeholder: '@yourstore' },
    { kind: 'youtube', label: 'YouTube', category: 'social', iconName: 'simple-icons:youtube', placeholder: 'https://youtube.com/@yourstore' },
    { kind: 'x', label: 'X (Twitter)', category: 'social', iconName: 'simple-icons:x', placeholder: '@yourstore' },
    { kind: 'linkedin', label: 'LinkedIn', category: 'social', iconName: 'simple-icons:linkedin', placeholder: 'https://linkedin.com/company/yourstore' },
    { kind: 'snapchat', label: 'Snapchat', category: 'social', iconName: 'simple-icons:snapchat', placeholder: '@yourstore' },
    { kind: 'telegram', label: 'Telegram', category: 'social', iconName: 'simple-icons:telegram', placeholder: 'https://t.me/yourstore' },
    { kind: 'viber', label: 'Viber', category: 'social', iconName: 'simple-icons:viber', placeholder: '+213550000000' },
    { kind: 'pinterest', label: 'Pinterest', category: 'social', iconName: 'simple-icons:pinterest', placeholder: 'https://pinterest.com/yourstore' },
    { kind: 'threads', label: 'Threads', category: 'social', iconName: 'simple-icons:threads', placeholder: '@yourstore' }
]

export const CONTACT_INFO_DEF_BY_KIND: Record<ContactInfoKind, ContactInfoKindDef> = Object.fromEntries(
    CONTACT_INFO_KIND_DEFS.map((d) => [d.kind, d])
) as any

export const isContactInfoKind = (value: unknown): value is ContactInfoKind =>
    typeof value === 'string' && (CONTACT_INFO_KINDS as readonly string[]).includes(value)

const stripLeadingAt = (value: string) => value.replace(/^@+/, '')

const ensureUrl = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return trimmed
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
}

const toWaMe = (value: string) => {
    const digits = value.replace(/[^\d+]/g, '').replace(/^\+/, '')
    return digits ? `https://wa.me/${digits}` : null
}

export const buildContactInfoHref = (kind: ContactInfoKind, rawValue: string): string | null => {
    const value = rawValue.trim()
    if (!value) return null

    switch (kind) {
        case 'phone': {
            const tel = value.replace(/[^\d+]/g, '')
            return tel ? `tel:${tel}` : null
        }
        case 'email': {
            return `mailto:${value}`
        }
        case 'address': {
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`
        }
        case 'map':
        case 'website': {
            return ensureUrl(value)
        }
        case 'whatsapp': {
            if (/^https?:\/\//i.test(value)) return value
            return toWaMe(value)
        }
        case 'facebook': {
            if (/^https?:\/\//i.test(value)) return value
            return `https://facebook.com/${stripLeadingAt(value)}`
        }
        case 'instagram': {
            if (/^https?:\/\//i.test(value)) return value
            return `https://instagram.com/${stripLeadingAt(value)}`
        }
        case 'tiktok': {
            if (/^https?:\/\//i.test(value)) return value
            return `https://www.tiktok.com/@${stripLeadingAt(value)}`
        }
        case 'youtube': {
            return ensureUrl(value)
        }
        case 'x': {
            if (/^https?:\/\//i.test(value)) return value
            return `https://x.com/${stripLeadingAt(value)}`
        }
        case 'linkedin': {
            return ensureUrl(value)
        }
        case 'snapchat': {
            if (/^https?:\/\//i.test(value)) return value
            return `https://www.snapchat.com/add/${stripLeadingAt(value)}`
        }
        case 'telegram': {
            if (/^https?:\/\//i.test(value)) return value
            return `https://t.me/${stripLeadingAt(value)}`
        }
        case 'viber': {
            if (/^https?:\/\//i.test(value)) return value
            const digits = value.replace(/[^\d+]/g, '')
            return digits ? `viber://chat?number=${encodeURIComponent(digits)}` : null
        }
        case 'pinterest': {
            return ensureUrl(value)
        }
        case 'threads': {
            if (/^https?:\/\//i.test(value)) return value
            return `https://www.threads.net/@${stripLeadingAt(value)}`
        }
        default: {
            const _exhaustive: never = kind
            return _exhaustive
        }
    }
}

