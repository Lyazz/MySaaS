// https://nuxt.com/docs/api/configuration/nuxt-config
const envSsr = process.env.NUXT_SSR
const ssrEnabled =
  envSsr == null ? true : !['false', '0', 'no'].includes(envSsr.toLowerCase())
const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https:"
].join('; ')
const securityHeaders = {
  'Content-Security-Policy-Report-Only': cspReportOnly,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()'
}
const withSecurityHeaders = (headers: Record<string, string> = {}) => ({ ...securityHeaders, ...headers })

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  ssr: ssrEnabled,
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  runtimeConfig: {
    public: {
      // Used by client-side redirects/URL builders (e.g. send tenant admins to root host).
      // Must match your production base domain (e.g. "swekly.com").
      platformBaseDomain:
        process.env.NUXT_PUBLIC_PLATFORM_BASE_DOMAIN ||
        process.env.PLATFORM_BASE_DOMAIN ||
        'platform.com'
    }
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxt/icon',
    '@vueuse/motion/nuxt',
    '@nuxtjs/i18n'
  ],
  i18n: {
    restructureDir: '.',
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [
      { code: 'en', iso: 'en-US', file: 'en.json', name: 'English', dir: 'ltr' },
      { code: 'fr', iso: 'fr-FR', file: 'fr.json', name: 'Français', dir: 'ltr' },
      { code: 'ar', iso: 'ar-DZ', file: 'ar.json', name: 'العربية', dir: 'rtl' }
    ],
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      alwaysRedirect: false,
      fallbackLocale: 'en'
    },
    vueI18n: './i18n.config.ts'
  },
  routeRules: {
    '/**': { headers: withSecurityHeaders() },

    // Never allow crawlers to index API responses.
    '/api/**': { headers: withSecurityHeaders({ 'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet' }) },

    // Admin areas must not be SSR-rendered (avoid leaking data in HTML) and must not be indexed by crawlers.
    '/admin': { ssr: false, headers: withSecurityHeaders({ 'x-robots-tag': 'noindex, nofollow, noarchive' }) },
    '/admin/**': { ssr: false, headers: withSecurityHeaders({ 'x-robots-tag': 'noindex, nofollow, noarchive' }) },
    '/super-admin': { ssr: false, headers: withSecurityHeaders({ 'x-robots-tag': 'noindex, nofollow, noarchive' }) },
    '/super-admin/**': { ssr: false, headers: withSecurityHeaders({ 'x-robots-tag': 'noindex, nofollow, noarchive' }) },

    // Auth / transactional pages are not SEO targets.
    '/login': { headers: withSecurityHeaders({ 'x-robots-tag': 'noindex, nofollow, noarchive' }) },
    '/register': { headers: withSecurityHeaders({ 'x-robots-tag': 'noindex, nofollow, noarchive' }) },
    '/cart': { headers: withSecurityHeaders({ 'x-robots-tag': 'noindex, nofollow, noarchive' }) },
    '/checkout': { headers: withSecurityHeaders({ 'x-robots-tag': 'noindex, nofollow, noarchive' }) },
    '/order-success': { headers: withSecurityHeaders({ 'x-robots-tag': 'noindex, nofollow, noarchive' }) }
  },
  icon: {
    componentName: 'Icon'
  },
  css: ['~/assets/css/main.css'],
  devServer: {
    host: '0.0.0.0'
  },
  vite: {
    server: {
      // Allow accessing the dev server via nip.io wildcard hosts from other devices on LAN
      allowedHosts: ['.nip.io', '.localhost'],
      cors: true
    }
  },
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Alice&family=Anton&family=JetBrains+Mono:wght@400;700&family=Nunito:wght@400;600;700;800&family=Orbitron:wght@400;500;700;900&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&family=Solway:wght@300;400;500;700&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap' }
      ]
    }
  },
  build: {
    transpile: ['@headlessui/vue']
  }
})
