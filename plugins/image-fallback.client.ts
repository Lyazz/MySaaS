import { installImageErrorFallback } from '~/utils/imageFallback'

export default defineNuxtPlugin(() => {
  const fallbackSrc = '/blank.svg?v=2'

  // Prefer Nuxt root if present, otherwise whole document.
  const root = (document.getElementById('__nuxt') ?? document) as unknown as ParentNode

  const cleanup = installImageErrorFallback({
    root,
    fallbackSrc,
    fallbackClass: 'img-fallback',
    treatSrcAsUnavailable: (src) => {
      // Remove placeholder services that render sizes/text (e.g. "600x400").
      const normalized = src.toLowerCase()
      return (
        normalized.startsWith('https://placehold.co/') ||
        normalized.startsWith('http://placehold.co/') ||
        normalized.startsWith('https://via.placeholder.com/') ||
        normalized.startsWith('http://via.placeholder.com/')
      )
    }
  })

  // Cleanup on HMR / app unmount (best-effort).
  if (import.meta.hot) {
    import.meta.hot.dispose(() => cleanup())
  }
})
