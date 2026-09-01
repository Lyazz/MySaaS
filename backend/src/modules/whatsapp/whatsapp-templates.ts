import type { TemplateDefinition } from './whatsapp-cloud.client'
import type { WhatsAppLanguage, WhatsAppTemplateKind } from './whatsapp.types'

/**
 * The message templates Swekly creates on every connected WABA.
 *
 * Meta freezes a template's wording at approval, so the seller's free-text
 * `whatsappConfirmationTemplate` (still used verbatim by the manual wa.me
 * button) cannot be the body here. What varies per order arrives as the five
 * parameters below; what varies per tenant — the confirmation link's origin —
 * is baked into the URL button when the template is created for that tenant.
 */

export const TEMPLATE_NAMES: Record<WhatsAppTemplateKind, string> = {
    CONFIRMATION: 'swekly_order_confirmation',
    REMINDER: 'swekly_order_reminder'
}

export const TEMPLATE_LANGUAGES: WhatsAppLanguage[] = ['fr', 'ar', 'en']

/** Order matters: it is the {{1}}..{{5}} order in every body below. */
export const TEMPLATE_BODY_PARAMS = ['customerName', 'orderReference', 'productsRecap', 'total', 'address'] as const

export const TEMPLATE_BODY_PARAM_COUNT = TEMPLATE_BODY_PARAMS.length

/**
 * Button layout, shared by both templates. The index of each button is what the
 * send call addresses, and what an incoming reply is matched against, so this
 * order is part of the contract: confirm = 0, cancel = 1, link = 2.
 */
export const CONFIRM_BUTTON_INDEX = 0
export const CANCEL_BUTTON_INDEX = 1
export const URL_BUTTON_INDEX = 2

export const CONFIRM_PAYLOAD_PREFIX = 'CONFIRM:'
export const CANCEL_PAYLOAD_PREFIX = 'CANCEL:'

type LocalizedCopy = {
    body: string
    confirmButton: string
    cancelButton: string
    urlButton: string
    footer: string
}

const COPY: Record<WhatsAppTemplateKind, Record<WhatsAppLanguage, LocalizedCopy>> = {
    CONFIRMATION: {
        fr: {
            body: [
                'Bonjour {{1}} 👋',
                'Votre commande {{2}} a bien été enregistrée.',
                '',
                '🛍️ {{3}}',
                '💰 Total : {{4}}',
                '📍 Livraison : {{5}}',
                '',
                'Merci de confirmer votre commande pour que nous lancions la préparation.'
            ].join('\n'),
            confirmButton: 'Confirmer',
            cancelButton: 'Annuler',
            urlButton: 'Voir ma commande',
            footer: 'Vous recevez ce message suite à votre commande.'
        },
        ar: {
            body: [
                'مرحبا {{1}} 👋',
                'تم تسجيل طلبك {{2}} بنجاح.',
                '',
                '🛍️ {{3}}',
                '💰 المجموع: {{4}}',
                '📍 التوصيل: {{5}}',
                '',
                'يرجى تأكيد طلبك حتى نبدأ في تحضيره.'
            ].join('\n'),
            confirmButton: 'تأكيد',
            cancelButton: 'إلغاء',
            urlButton: 'تفاصيل الطلب',
            footer: 'تتلقى هذه الرسالة بعد طلبك.'
        },
        en: {
            body: [
                'Hello {{1}} 👋',
                'Your order {{2}} has been received.',
                '',
                '🛍️ {{3}}',
                '💰 Total: {{4}}',
                '📍 Delivery: {{5}}',
                '',
                'Please confirm your order so we can start preparing it.'
            ].join('\n'),
            confirmButton: 'Confirm',
            cancelButton: 'Cancel',
            urlButton: 'View my order',
            footer: 'You receive this message following your order.'
        }
    },
    REMINDER: {
        fr: {
            body: [
                'Bonjour {{1}} 👋',
                "Nous n'avons pas encore reçu votre confirmation pour la commande {{2}}.",
                '',
                '🛍️ {{3}}',
                '💰 Total : {{4}}',
                '📍 Livraison : {{5}}',
                '',
                'Confirmez-vous cette commande ?'
            ].join('\n'),
            confirmButton: 'Confirmer',
            cancelButton: 'Annuler',
            urlButton: 'Voir ma commande',
            footer: 'Vous recevez ce message suite à votre commande.'
        },
        ar: {
            body: [
                'مرحبا {{1}} 👋',
                'لم نستلم بعد تأكيدك للطلب {{2}}.',
                '',
                '🛍️ {{3}}',
                '💰 المجموع: {{4}}',
                '📍 التوصيل: {{5}}',
                '',
                'هل تؤكد هذا الطلب؟'
            ].join('\n'),
            confirmButton: 'تأكيد',
            cancelButton: 'إلغاء',
            urlButton: 'تفاصيل الطلب',
            footer: 'تتلقى هذه الرسالة بعد طلبك.'
        },
        en: {
            body: [
                'Hello {{1}} 👋',
                'We have not received your confirmation for order {{2}} yet.',
                '',
                '🛍️ {{3}}',
                '💰 Total: {{4}}',
                '📍 Delivery: {{5}}',
                '',
                'Do you confirm this order?'
            ].join('\n'),
            confirmButton: 'Confirm',
            cancelButton: 'Cancel',
            urlButton: 'View my order',
            footer: 'You receive this message following your order.'
        }
    }
}

/** Sample values Meta requires alongside every body variable. */
const BODY_EXAMPLE: Record<WhatsAppLanguage, string[]> = {
    fr: ['Amine', 'ORDR-1042', '2x T-shirt coton (2 500 DZD)', '5 200 DZD', 'Alger, Bab Ezzouar'],
    ar: ['أمين', 'ORDR-1042', '2x تي شيرت قطن (2 500 DZD)', '5 200 DZD', 'الجزائر، باب الزوار'],
    en: ['Amine', 'ORDR-1042', '2x Cotton T-shirt (2 500 DZD)', '5 200 DZD', 'Algiers, Bab Ezzouar']
}

const EXAMPLE_TOKEN = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'

/** The path a confirmation link points at, on the tenant's own origin. */
export const confirmPathPrefix = 'confirm-order'

/**
 * Builds the Graph API payload for one template in one language.
 *
 * `confirmOrigin` is the tenant's public origin: the URL button is static except
 * for its last segment, so the origin has to be part of the approved template.
 */
export const buildTemplateDefinition = (
    kind: WhatsAppTemplateKind,
    language: WhatsAppLanguage,
    confirmOrigin: string
): TemplateDefinition => {
    const copy = COPY[kind][language]
    const origin = confirmOrigin.replace(/\/+$/, '')

    return {
        name: TEMPLATE_NAMES[kind],
        language,
        category: 'UTILITY',
        components: [
            {
                type: 'BODY',
                text: copy.body,
                example: { body_text: [BODY_EXAMPLE[language]] }
            },
            { type: 'FOOTER', text: copy.footer },
            {
                type: 'BUTTONS',
                buttons: [
                    { type: 'QUICK_REPLY', text: copy.confirmButton },
                    { type: 'QUICK_REPLY', text: copy.cancelButton },
                    {
                        type: 'URL',
                        text: copy.urlButton,
                        url: `${origin}/${confirmPathPrefix}/{{1}}`,
                        example: [`${origin}/${confirmPathPrefix}/${EXAMPLE_TOKEN}`]
                    }
                ]
            }
        ]
    }
}

/**
 * Meta rejects a parameter that contains a newline, a tab, or four consecutive
 * spaces, and truncates nothing for us. The product recap is the usual offender:
 * the manual wa.me message lists items one per line, which cannot survive here.
 */
export const sanitizeTemplateParam = (value: unknown, maxLength = 700): string => {
    const text = (typeof value === 'string' ? value : String(value ?? ''))
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()

    if (!text) return '-'
    if (text.length <= maxLength) return text
    return `${text.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`
}
