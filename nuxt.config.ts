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
  // connect.facebook.net serves the SDK behind WhatsApp Embedded Signup, loaded
  // on demand from the integrations screen.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net",
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

  /*
   * Server sourcemaps are what pushed the production build over the 4 GB heap
   * the Dockerfile grants it: `npm run build` died with an OOM in the Nitro
   * stage, on this commit and on every commit before it, so no image could be
   * produced at all. Turning them off brings the build back under the cap
   * without needing a bigger build machine.
   *
   * The cost is that server stack traces in production point at bundled
   * output rather than source. If that becomes the thing standing between you
   * and a production bug, the alternative fix is to raise
   * --max-old-space-size in the Dockerfile and set this back to true — the
   * build needs a little over 4 GB and passes comfortably at 8 GB.
   *
   * `client` keeps Nuxt's default (off in production); it is spelled out here
   * so the whole policy is readable in one place.
   */
  sourcemap: { server: false, client: false },
  runtimeConfig: {
    public: {
      // Used by client-side redirects/URL builders (e.g. send tenant admins to root host).
      // Must match your production base domain (e.g. "swekly.com").
      platformBaseDomain:
        process.env.NUXT_PUBLIC_PLATFORM_BASE_DOMAIN ||
        process.env.PLATFORM_BASE_DOMAIN ||
        'swekly.com',
      // Set to "false" to close the public marketing site ("site vitrine"): every
      // vitrine page redirects to /site-closed and POST /api/register returns 403.
      // /login, /forgot-password, /admin/** and /super-admin/** stay reachable, and
      // tenant storefronts are unaffected. Remove the var (or set "true") to reopen.
      registrationsOpen:
        (process.env.NUXT_PUBLIC_REGISTRATIONS_OPEN ??
          process.env.REGISTRATIONS_OPEN ??
          'true') !== 'false'
    }
  },
  /*
   * The design-kit primitives are registered without the directory prefix, so
   * they read as `<UiButton>` rather than `<UiUiButton>` and no template needs
   * an explicit import. Everything else keeps Nuxt's default path prefixing.
   */
  components: [
    { path: '~/components/ui', pathPrefix: false },
    '~/components'
  ],
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
    '/admin/template-builder-preview': { ssr: false, headers: withSecurityHeaders({ 'X-Frame-Options': 'SAMEORIGIN', 'x-robots-tag': 'noindex, nofollow, noarchive' }) },
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
  css: [
    '~/assets/css/main.css',
    '~/assets/css/admin-settings.css',
    'driver.js/dist/driver.css',
    '~/assets/css/driver-theme.css',
  ],
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
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Archivo+Narrow:wght@500;600;700&family=Fraunces:opsz,wght@9..144,300..700&display=swap' },
        // Cozy (slow-living editorial): Newsreader is the magazine voice (display + real italics), Hanken Grotesk sets the UI microtype.
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&display=swap' },
        // Playful (candy kawaii): Baloo 2 is the rounded display voice; Nunito (loaded above) sets body + UI.
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&display=swap' }
      ]
    }
  },
  build: {
    transpile: ['@headlessui/vue']
  }
})
