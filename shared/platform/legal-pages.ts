export const PLATFORM_LEGAL_PAGE_KEYS = [
  'terms',
  'privacy',
  'cookies',
  'billing'
] as const

export type PlatformLegalPageKey = (typeof PLATFORM_LEGAL_PAGE_KEYS)[number]
export type PlatformLegalLanguage = 'en' | 'fr' | 'ar'
export type PlatformLegalLocalizedText = Record<PlatformLegalLanguage, string>

export type PlatformLegalSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export type PlatformLegalPage = {
  key: PlatformLegalPageKey
  title: string
  footerLabel: PlatformLegalLocalizedText
  description: string
  updatedAt: string
  sections: PlatformLegalSection[]
}

const UPDATED_AT = 'May 9, 2026'

export const PLATFORM_LEGAL_PAGES: Record<PlatformLegalPageKey, PlatformLegalPage> = {
  terms: {
    key: 'terms',
    title: 'Terms of Service',
    footerLabel: {
      en: 'Terms of Service',
      fr: 'Conditions de service',
      ar: 'شروط الخدمة'
    },
    description: 'The rules for accessing and using Swekly as a hosted software platform.',
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: 'Platform role',
        paragraphs: [
          'Swekly provides hosted software tools that help businesses create online storefronts, manage products, receive orders, organize staff access, configure integrations, and review operational data.',
          'Swekly is a technical platform provider. Unless a separate written agreement says otherwise, Swekly does not own tenant stores, sell tenant products, act as merchant of record, act as payment provider, act as delivery provider, or become a party to transactions between a tenant and its customers.'
        ]
      },
      {
        heading: 'Accounts and access',
        paragraphs: [
          'The account owner is responsible for keeping account information accurate, securing passwords and devices, choosing appropriate staff permissions, and supervising all activity performed through the account.',
          'You must notify Swekly promptly if you believe an account, token, integration key, or staff access has been compromised.'
        ]
      },
      {
        heading: 'Tenant stores and customer relationships',
        paragraphs: [
          'Each tenant independently controls its store, product catalog, prices, stock, customer communications, delivery promises, return rules, and commercial decisions.',
          'Customers who buy from a tenant store are buying from that tenant, not from Swekly. Tenant stores must provide their own accurate customer-facing terms, privacy notices, return rules, and contact information.'
        ]
      },
      {
        heading: 'Acceptable use',
        paragraphs: [
          'You may only use Swekly in a lawful, honest, and secure way. You are responsible for your users, staff, store content, integrations, automations, and customer-facing activity.',
          'You must not use Swekly to create, sell, promote, transmit, store, or facilitate content, products, services, or activity that is unlawful, deceptive, abusive, unsafe, or infringes the rights of others.'
        ],
        bullets: [
          'Illegal products or services, or products that require approvals you do not have.',
          'False advertising, fake reviews, misleading prices, hidden fees, or deceptive delivery promises.',
          'Infringing, counterfeit, stolen, or unauthorized goods, images, names, trademarks, or copyrighted materials.',
          'Spam, phishing, malware, credential harvesting, account takeover, or unauthorized scraping.',
          'Harassment, threats, hate, exploitation, non-consensual content, or content that targets vulnerable people.',
          'Attempts to bypass platform limits, security controls, billing controls, or tenant isolation.'
        ]
      },
      {
        heading: 'Security and platform integrity',
        paragraphs: [
          'You must not probe, scan, overload, reverse engineer, disrupt, or misuse Swekly systems, APIs, infrastructure, or other tenant environments.',
          'You must keep integration credentials private and must not use third-party services in a way that violates their terms or harms customers.'
        ]
      },
      {
        heading: 'Independent tenant activity',
        paragraphs: [
          'Tenants are independent businesses or individuals who use Swekly to operate their own stores. Swekly provides technical tools; tenants decide what they sell, how they present it, how they price it, how they fulfill orders, and how they support customers.',
          'Swekly does not approve, guarantee, inspect, own, store, ship, or warrant tenant products. Swekly does not control tenant inventory, product quality, product legality, product safety, claims, descriptions, images, customer messages, delivery timing, returns, refunds, taxes, or after-sales support.'
        ]
      },
      {
        heading: 'Tenant obligations',
        paragraphs: [
          'Each tenant is solely responsible for its store activity and must comply with all laws, platform rules, third-party rights, industry rules, payment rules, delivery-provider rules, and customer promises that apply to its business.'
        ],
        bullets: [
          'Keeping product descriptions, prices, stock, delivery information, and policies accurate.',
          'Obtaining required licenses, permits, consents, and approvals.',
          'Handling customer questions, complaints, cancellations, refunds, exchanges, warranties, and disputes.',
          'Paying taxes, fees, duties, chargebacks, penalties, and other obligations linked to its activity.',
          'Ensuring staff, contractors, integrations, and service providers act lawfully and securely.'
        ]
      },
      {
        heading: 'No responsibility for tenant conduct',
        paragraphs: [
          'To the fullest extent permitted by applicable law, Swekly disclaims responsibility for tenant activities, tenant products, tenant content, tenant omissions, tenant promises, and disputes between tenants and their customers.',
          'Swekly may act on abuse reports or policy violations, but any review, moderation, suspension, or support action does not make Swekly responsible for a tenant store or its commercial obligations.'
        ]
      },
      {
        heading: 'Customer disputes',
        paragraphs: [
          'Customers should contact the tenant store for questions about orders, payments, delivery, products, returns, refunds, warranties, or customer service.',
          'Swekly may forward reports to a tenant, preserve relevant technical records, or restrict platform access when necessary, but Swekly is not a replacement for the tenant customer-service channel.'
        ]
      },
      {
        heading: 'Tenant indemnity',
        paragraphs: [
          'Where permitted by applicable law, tenants agree to defend, indemnify, and hold Swekly harmless from claims, losses, fines, damages, costs, and expenses arising from their products, content, store activity, customer relationships, legal non-compliance, or violation of platform terms.'
        ]
      },
      {
        heading: 'Content and intellectual property',
        paragraphs: [
          'Tenants keep ownership of the content they upload or configure in the platform. By using Swekly, tenants grant Swekly the limited rights needed to host, process, display, back up, secure, and transmit that content as part of the service.',
          'Swekly owns the platform software, interface, workflows, templates, documentation, and related technology, except for tenant content and third-party materials.'
        ]
      },
      {
        heading: 'Service changes and availability',
        paragraphs: [
          'Swekly may update, improve, restrict, suspend, or discontinue features when needed for security, reliability, legal compliance, billing, abuse prevention, or product development.',
          'Swekly works to keep the service reliable, but does not guarantee uninterrupted or error-free availability.'
        ]
      },
      {
        heading: 'Limitation of liability',
        paragraphs: [
          'To the fullest extent permitted by applicable law, Swekly is not liable for tenant products, tenant content, tenant promises, customer disputes, lost profits, lost revenue, indirect damages, or losses caused by misuse of the platform.',
          'Nothing in these terms limits liability where applicable law does not allow that limitation.'
        ]
      }
    ]
  },
  privacy: {
    key: 'privacy',
    title: 'Privacy Policy',
    footerLabel: {
      en: 'Privacy Policy',
      fr: 'Politique de confidentialité',
      ar: 'سياسة الخصوصية'
    },
    description: 'How Swekly handles account, platform, support, billing, and store-operation data.',
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: 'Data we collect',
        paragraphs: [
          'Swekly collects data needed to operate and secure the platform, including account details, admin user profiles, authentication events, billing records, support messages, store configuration, technical logs, device data, and usage information.',
          'Tenant stores may collect customer data such as names, contact details, addresses, order details, delivery preferences, and messages. Swekly processes this data as a technical service provider for the tenant that controls the store.'
        ]
      },
      {
        heading: 'How we use data',
        paragraphs: [
          'We use data to provide the platform, authenticate users, process subscriptions, deliver support, prevent abuse, monitor reliability, improve product quality, maintain audit trails, and communicate service updates.',
          'We do not sell personal data. We do not use tenant customer order data to independently market unrelated third-party products to those customers.'
        ]
      },
      {
        heading: 'Tenant responsibility for storefront data',
        paragraphs: [
          'Each tenant is responsible for explaining to its customers what data it collects, why it collects it, how long it keeps it, who it shares it with, and how customers can exercise their rights.',
          'Tenants must only collect data they are allowed to collect and must configure their store, forms, tracking tools, integrations, and exports in compliance with applicable laws and customer promises.'
        ]
      },
      {
        heading: 'Sharing and subprocessors',
        paragraphs: [
          'Swekly may share data with infrastructure, hosting, analytics, security, communications, payment, billing, and support providers where needed to operate the service.',
          'Swekly may also disclose data when required to comply with law, enforce agreements, protect the platform, investigate abuse, or respond to a valid legal request.'
        ]
      },
      {
        heading: 'Security and retention',
        paragraphs: [
          'Swekly uses administrative, technical, and organizational safeguards designed to protect platform data. No system can be guaranteed to be completely secure.',
          'We keep data for as long as needed to provide the service, meet legal or accounting obligations, resolve disputes, maintain security, and enforce agreements. Tenants control retention choices for many categories of storefront customer data.'
        ]
      },
      {
        heading: 'Privacy requests',
        paragraphs: [
          'Platform account users can contact Swekly to request access, correction, deletion, export, or restriction of their account data, subject to identity verification and applicable limits.',
          'Storefront customers should first contact the tenant store they purchased from, because the tenant controls the commercial relationship and the customer data collected through that store.'
        ]
      }
    ]
  },
  cookies: {
    key: 'cookies',
    title: 'Cookie Policy',
    footerLabel: {
      en: 'Cookie Policy',
      fr: 'Politique de cookies',
      ar: 'سياسة ملفات تعريف الارتباط'
    },
    description: 'How Swekly and tenant stores use cookies and similar technologies.',
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: 'What cookies are',
        paragraphs: [
          'Cookies and similar technologies are small identifiers stored on a browser or device. They help websites remember settings, keep sessions active, secure accounts, measure performance, and support optional integrations.'
        ]
      },
      {
        heading: 'How Swekly uses cookies',
        paragraphs: [
          'Swekly may use necessary cookies for login, authentication, security, load balancing, fraud prevention, language preferences, cart behavior, and core platform features.',
          'Swekly may also use analytics or communication tools to understand platform usage, improve reliability, and support users, where allowed by applicable settings and law.'
        ]
      },
      {
        heading: 'Tenant storefront cookies',
        paragraphs: [
          'Tenant stores may enable their own tracking, analytics, advertising, chat, payment, delivery, or other third-party tools. Tenants are responsible for explaining those tools to their customers and collecting any required consent.',
          'Swekly provides technical controls, but tenants choose which optional storefront tools and integrations they enable.'
        ]
      },
      {
        heading: 'Your choices',
        paragraphs: [
          'Most browsers allow users to block, delete, or limit cookies. Some platform and storefront features may not work correctly if necessary cookies are disabled.',
          'For tenant-store tracking choices, customers should also review the tenant store privacy policy and cookie notice.'
        ]
      }
    ]
  },
  billing: {
    key: 'billing',
    title: 'Billing and Subscription Terms',
    footerLabel: {
      en: 'Billing and Subscription Terms',
      fr: 'Conditions de facturation et d’abonnement',
      ar: 'شروط الفوترة والاشتراك'
    },
    description: 'How Swekly subscriptions, renewals, cancellations, and plan limits work.',
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: 'Subscription fees',
        paragraphs: [
          'Swekly charges tenants for access to platform plans, add-ons, usage limits, and paid services described at checkout, in the admin dashboard, in an invoice, or in a separate written agreement.',
          'Tenant subscription fees are separate from products, delivery charges, refunds, discounts, or payments handled between tenants and their customers.'
        ]
      },
      {
        heading: 'Renewals and payment failures',
        paragraphs: [
          'Paid plans may renew automatically unless canceled before the renewal date. If payment fails, Swekly may retry payment, notify the account owner, restrict paid features, suspend access, or downgrade the account where appropriate.',
          'Tenants are responsible for keeping billing details current and for paying all amounts due for their selected plan and usage.'
        ]
      },
      {
        heading: 'Taxes and fees',
        paragraphs: [
          'Listed prices may exclude taxes, duties, bank fees, payment-provider fees, and other charges unless expressly stated otherwise. Tenants are responsible for taxes and fees that apply to their subscription and their own business activity.'
        ]
      },
      {
        heading: 'Cancellations and refunds',
        paragraphs: [
          'A tenant may cancel its subscription according to the cancellation flow available in the platform or support channel. Cancellation may stop future renewals but does not automatically erase store data or remove unpaid balances.',
          'Refunds for Swekly subscription fees may be requested within 30 days of the subscription payment date, unless a separate written agreement says otherwise. Refunds owed by a tenant to its customers are solely the tenant store responsibility.'
        ]
      },
      {
        heading: 'Plan limits',
        paragraphs: [
          'Plans may include limits for stores, users, orders, products, storage, traffic, integrations, support levels, or other features. Swekly may enforce limits automatically or require an upgrade when usage exceeds the selected plan.'
        ]
      }
    ]
  }
}

export const isPlatformLegalPageKey = (value: string): value is PlatformLegalPageKey =>
  PLATFORM_LEGAL_PAGE_KEYS.includes(value as PlatformLegalPageKey)

export const getPlatformLegalPage = (value: string): PlatformLegalPage | null =>
  isPlatformLegalPageKey(value) ? PLATFORM_LEGAL_PAGES[value] : null

export const getPlatformLegalFooterLabel = (
  key: PlatformLegalPageKey,
  language: string
) => {
  if (language === 'fr' || language === 'ar' || language === 'en') {
    return PLATFORM_LEGAL_PAGES[key].footerLabel[language]
  }

  return PLATFORM_LEGAL_PAGES[key].footerLabel.en
}

export const platformLegalLinks = PLATFORM_LEGAL_PAGE_KEYS.map((key) => ({
  key,
  to: `/legal/${key}`
}))
