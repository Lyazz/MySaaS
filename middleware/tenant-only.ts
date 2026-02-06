export default defineNuxtRouteMiddleware(() => {
  const tenant = useState<any>('tenant')
  if (tenant.value) return

  if (process.server) {
    const event = useRequestEvent()
    if (event?.context?.tenant) {
      tenant.value = event.context.tenant

      const storeSettings = useState<any>('storeSettings')
      if (!storeSettings.value && event.context.storeSettings) {
        storeSettings.value = event.context.storeSettings
      }

      const facebookPixelId = useState<string | null>('facebookPixelId', () => null)
      const pixelId = (event.context as any)?.facebookPixelId
      if (!facebookPixelId.value && (typeof pixelId === 'string' || pixelId == null)) {
        facebookPixelId.value = pixelId ?? null
      }

      return
    }
  }

  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
})
