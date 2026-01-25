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

      return
    }
  }

  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
})
