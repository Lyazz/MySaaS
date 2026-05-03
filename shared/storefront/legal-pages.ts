export const STORE_LEGAL_LANGUAGES = ['fr', 'en', 'ar'] as const
export type StoreLegalLanguage = (typeof STORE_LEGAL_LANGUAGES)[number]

export const STORE_LEGAL_PAGE_KEYS = ['terms', 'privacy', 'returns', 'contact'] as const
export type StoreLegalPageKey = (typeof STORE_LEGAL_PAGE_KEYS)[number]

export type StoreLegalLocalizedText = Record<StoreLegalLanguage, string>

export type StoreLegalPageConfig = {
  enabled: boolean
  title: StoreLegalLocalizedText
  content: StoreLegalLocalizedText
}

export type StoreLegalPagesConfig = Record<StoreLegalPageKey, StoreLegalPageConfig>

const DEFAULT_CONTENT: Record<StoreLegalPageKey, StoreLegalLocalizedText> = {
  terms: {
    fr: `<p>En accedant a cette boutique, vous acceptez les presentes conditions d'utilisation.</p><p>Les produits, prix et disponibilites peuvent etre modifies a tout moment.</p><p>Toute commande validee implique l'acceptation des informations fournies lors du passage de commande.</p><p>En cas d'usage abusif ou frauduleux, la boutique se reserve le droit de refuser une commande.</p>`,
    en: `<p>By using this store, you agree to these terms of use.</p><p>Products, prices, and availability may change at any time.</p><p>Any confirmed order means you accept the information provided during checkout.</p><p>In case of abusive or fraudulent activity, the store may refuse an order.</p>`,
    ar: `<p>باستخدامك لهذا المتجر، فإنك توافق على شروط الاستخدام هذه.</p><p>قد يتم تعديل المنتجات والأسعار والتوفر في أي وقت.</p><p>تأكيد أي طلب يعني موافقتك على المعلومات التي أدخلتها أثناء إتمام الطلب.</p><p>في حال وجود إساءة استخدام أو نشاط احتيالي، يحق للمتجر رفض الطلب.</p>`
  },
  privacy: {
    fr: `<p>Nous collectons uniquement les donnees necessaires au traitement de vos commandes (nom, telephone, adresse et details de livraison).</p><p>Vos donnees ne sont pas revendues. Elles sont utilisees uniquement pour la gestion des commandes, le service client et l'amelioration du service.</p><p>Vous pouvez demander la correction ou la suppression de vos donnees en contactant la boutique.</p>`,
    en: `<p>We only collect data required to process your orders (name, phone, address, and delivery details).</p><p>Your data is not sold. It is used only for order management, customer support, and service improvement.</p><p>You may request correction or deletion of your data by contacting the store.</p>`,
    ar: `<p>نقوم بجمع البيانات الضرورية فقط لمعالجة طلباتك (الاسم، رقم الهاتف، العنوان، وتفاصيل التوصيل).</p><p>لا يتم بيع بياناتك. تُستخدم فقط لإدارة الطلبات وخدمة العملاء وتحسين الخدمة.</p><p>يمكنك طلب تصحيح بياناتك أو حذفها عبر التواصل مع المتجر.</p>`
  },
  returns: {
    fr: `<p>Vous pouvez demander un retour selon les delais annonces par la boutique.</p><p>Le produit doit etre retourne dans son etat d'origine.</p><p>Les frais de retour et les modalites de remboursement sont precises lors de la validation de la demande.</p><p>Les produits personnalises ou endommages par une mauvaise utilisation peuvent etre exclus du retour.</p>`,
    en: `<p>You may request a return according to the timelines announced by the store.</p><p>The product must be returned in its original condition.</p><p>Return fees and refund rules are confirmed when your request is reviewed.</p><p>Customized products or products damaged by misuse may be excluded from returns.</p>`,
    ar: `<p>يمكنك طلب إرجاع المنتج وفق المهل المحددة من طرف المتجر.</p><p>يجب أن يكون المنتج في حالته الأصلية عند الإرجاع.</p><p>تُحدد رسوم الإرجاع وشروط الاسترجاع المالي عند مراجعة طلبك.</p><p>قد تُستثنى المنتجات المخصصة أو المتضررة بسبب سوء الاستخدام من سياسة الإرجاع.</p>`
  },
  contact: {
    fr: `<p>Pour toute question sur votre commande, la livraison ou le service apres-vente, contactez-nous via les canaux officiels affiches par la boutique.</p><p>Merci de preparer votre numero de commande pour un traitement plus rapide.</p>`,
    en: `<p>For any question about your order, delivery, or after-sales support, contact us through the official channels displayed by the store.</p><p>Please prepare your order number for faster assistance.</p>`,
    ar: `<p>لأي استفسار حول طلبك أو التوصيل أو خدمة ما بعد البيع، تواصل معنا عبر القنوات الرسمية المعروضة في المتجر.</p><p>يرجى تجهيز رقم الطلب لتسريع المعالجة.</p>`
  }
}

const DEFAULT_TITLES: Record<StoreLegalPageKey, StoreLegalLocalizedText> = {
  terms: {
    fr: "Conditions d'utilisation",
    en: 'Terms of Use',
    ar: 'شروط الاستخدام'
  },
  privacy: {
    fr: 'Politique de confidentialite',
    en: 'Privacy Policy',
    ar: 'سياسة الخصوصية'
  },
  returns: {
    fr: 'Politique de retour',
    en: 'Return Policy',
    ar: 'سياسة الإرجاع'
  },
  contact: {
    fr: 'Contact',
    en: 'Contact',
    ar: 'اتصل بنا'
  }
}

const cloneLocalized = (value: StoreLegalLocalizedText): StoreLegalLocalizedText => ({
  fr: value.fr,
  en: value.en,
  ar: value.ar
})

export const buildDefaultStoreLegalPagesConfig = (): StoreLegalPagesConfig => ({
  terms: {
    enabled: false,
    title: cloneLocalized(DEFAULT_TITLES.terms),
    content: cloneLocalized(DEFAULT_CONTENT.terms)
  },
  privacy: {
    enabled: false,
    title: cloneLocalized(DEFAULT_TITLES.privacy),
    content: cloneLocalized(DEFAULT_CONTENT.privacy)
  },
  returns: {
    enabled: false,
    title: cloneLocalized(DEFAULT_TITLES.returns),
    content: cloneLocalized(DEFAULT_CONTENT.returns)
  },
  contact: {
    enabled: false,
    title: cloneLocalized(DEFAULT_TITLES.contact),
    content: cloneLocalized(DEFAULT_CONTENT.contact)
  }
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeLocalized = (
  value: unknown,
  fallback: StoreLegalLocalizedText
): StoreLegalLocalizedText => {
  if (!isRecord(value)) return cloneLocalized(fallback)
  return {
    fr: typeof value.fr === 'string' ? value.fr : fallback.fr,
    en: typeof value.en === 'string' ? value.en : fallback.en,
    ar: typeof value.ar === 'string' ? value.ar : fallback.ar
  }
}

export const normalizeStoreLegalPagesConfig = (value: unknown): StoreLegalPagesConfig => {
  const defaults = buildDefaultStoreLegalPagesConfig()
  if (!isRecord(value)) return defaults

  for (const key of STORE_LEGAL_PAGE_KEYS) {
    const rawPage = value[key]
    if (!isRecord(rawPage)) continue

    defaults[key] = {
      enabled: rawPage.enabled === true,
      title: normalizeLocalized(rawPage.title, defaults[key].title),
      content: normalizeLocalized(rawPage.content, defaults[key].content)
    }
  }

  return defaults
}

export const isValidStoreLegalPagesConfig = (value: unknown): value is StoreLegalPagesConfig => {
  if (!isRecord(value)) return false

  for (const key of STORE_LEGAL_PAGE_KEYS) {
    const rawPage = value[key]
    if (!isRecord(rawPage)) return false
    if (typeof rawPage.enabled !== 'boolean') return false

    const title = rawPage.title
    const content = rawPage.content
    if (!isRecord(title) || !isRecord(content)) return false

    for (const lang of STORE_LEGAL_LANGUAGES) {
      if (typeof title[lang] !== 'string') return false
      if (typeof content[lang] !== 'string') return false
    }
  }

  return true
}
