/**
 * Catalogue of ways a tenant can pay for a subscription.
 *
 * The billing screen used to hold all of this inline: the payout accounts were
 * hardcoded in the template, the EUR rate was a magic 280 buried in a computed,
 * and the MyFin/Paysera instructions were built with a manual `if (locale ===
 * 'fr')` chain that bypassed i18n entirely. The backend meanwhile accepted
 * `String(method)` from the client with no whitelist at all.
 *
 * One catalogue now feeds the picker, the instructions and the server-side
 * validation.
 */

export type PaymentMethodId = 'BARIDIMOB' | 'CCP' | 'MYFIN' | 'PAYSERA' | 'CHARGILY'

export type SettlementCurrency = 'DZD' | 'EUR'

export interface PaymentMethodDefinition {
    id: PaymentMethodId
    icon: string
    /** Manual transfers need a receipt before anyone can review them. */
    requiresProof: boolean
    /** `false` renders as "coming soon" and is rejected server-side. */
    available: boolean
    /** What the customer actually transfers. */
    settlementCurrency: SettlementCurrency
    /**
     * Payout account, as label-key/value pairs so the UI can render a copyable
     * list instead of a pre-formatted blob of text.
     */
    account: ReadonlyArray<{ labelKey: string; value: string }>
}

/**
 * Indicative EUR reference rate for the two foreign-currency wallets. It only
 * ever produces a *guide* amount shown next to the authoritative DZD total —
 * the ledger is always in DZD.
 */
export const EUR_REFERENCE_RATE_DZD = 280

export const PAYMENT_METHODS: readonly PaymentMethodDefinition[] = [
    {
        id: 'BARIDIMOB',
        icon: 'lucide:smartphone',
        requiresProof: true,
        available: true,
        settlementCurrency: 'DZD',
        account: [
            { labelKey: 'admin.pages.billing.payment.account.rip', value: '007 99999 0000000000 12' },
            { labelKey: 'admin.pages.billing.payment.account.holder', value: 'Swekly SARL' }
        ]
    },
    {
        id: 'CCP',
        icon: 'lucide:landmark',
        requiresProof: true,
        available: true,
        settlementCurrency: 'DZD',
        account: [
            { labelKey: 'admin.pages.billing.payment.account.ccp', value: '12345678 clé 99' },
            { labelKey: 'admin.pages.billing.payment.account.holder', value: 'Swekly SARL' }
        ]
    },
    {
        id: 'MYFIN',
        icon: 'lucide:credit-card',
        requiresProof: true,
        available: true,
        settlementCurrency: 'EUR',
        account: [
            { labelKey: 'admin.pages.billing.payment.account.iban', value: 'BG98MYFI123123123' },
            { labelKey: 'admin.pages.billing.payment.account.holder', value: 'Swekly SARL' }
        ]
    },
    {
        id: 'PAYSERA',
        icon: 'lucide:euro',
        requiresProof: true,
        available: true,
        settlementCurrency: 'EUR',
        account: [
            { labelKey: 'admin.pages.billing.payment.account.email', value: 'payments@swekly.com' },
            { labelKey: 'admin.pages.billing.payment.account.holder', value: 'Swekly SARL' }
        ]
    },
    {
        id: 'CHARGILY',
        icon: 'lucide:zap',
        requiresProof: false,
        available: false,
        settlementCurrency: 'DZD',
        account: []
    }
] as const

export const getPaymentMethod = (id: string): PaymentMethodDefinition | null =>
    (PAYMENT_METHODS as readonly PaymentMethodDefinition[]).find((m) => m.id === id) ?? null

export const isPaymentMethodId = (value: unknown): value is PaymentMethodId =>
    typeof value === 'string' && PAYMENT_METHODS.some((m) => m.id === value)

/** DZD converted at the indicative reference rate, rounded to the cent. */
export const toEurGuideAmount = (amountDzd: number): number =>
    Math.round((amountDzd / EUR_REFERENCE_RATE_DZD) * 100) / 100
