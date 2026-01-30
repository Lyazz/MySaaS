// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxt/icon', '@vueuse/motion/nuxt'],
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
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap' }
      ]
    }
  },
  build: {
    transpile: ['@headlessui/vue']
  }
})
