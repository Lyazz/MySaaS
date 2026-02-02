// https://nuxt.com/docs/api/configuration/nuxt-config
const envSsr = process.env.NUXT_SSR
const ssrEnabled =
  envSsr == null ? true : !['false', '0', 'no'].includes(envSsr.toLowerCase())

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  ssr: ssrEnabled,
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxt/icon', '@vueuse/motion/nuxt'],
  routeRules: {
    // Never allow crawlers to index API responses.
    '/api/**': { headers: { 'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet' } },

    // Admin areas must not be SSR-rendered (avoid leaking data in HTML) and must not be indexed by crawlers.
    '/admin': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow, noarchive' } },
    '/admin/**': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow, noarchive' } },
    '/super-admin': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow, noarchive' } },
    '/super-admin/**': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow, noarchive' } },

    // Auth / transactional pages are not SEO targets.
    '/login': { headers: { 'x-robots-tag': 'noindex, nofollow, noarchive' } },
    '/register': { headers: { 'x-robots-tag': 'noindex, nofollow, noarchive' } },
    '/cart': { headers: { 'x-robots-tag': 'noindex, nofollow, noarchive' } },
    '/checkout': { headers: { 'x-robots-tag': 'noindex, nofollow, noarchive' } },
    '/order-success': { headers: { 'x-robots-tag': 'noindex, nofollow, noarchive' } }
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
      allowedHosts: ['.nip.io']
    }
  },
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Alice&family=Anton&family=JetBrains+Mono:wght@400;700&family=Nunito:wght@400;600;700;800&family=Orbitron:wght@400;500;700;900&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&family=Solway:wght@300;400;500;700&display=swap' }
      ]
    }
  },
  build: {
    transpile: ['@headlessui/vue']
  }
})
