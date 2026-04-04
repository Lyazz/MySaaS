import { toSaasHost, useRequestOrigin } from '~/composables/host'
import { usePlatformBaseDomain } from '~/composables/platformBaseDomain'

export default defineNuxtRouteMiddleware((to) => {
  const tenant = useState<any>('tenant')
  if (!tenant.value) return

  const { protocol, host } = useRequestOrigin()
  const platformBaseDomain = usePlatformBaseDomain()
  const saasHost = toSaasHost(host, { platformBaseDomain })
  if (!saasHost) return

  return navigateTo(`${protocol}://${saasHost}${to.fullPath}`, { external: true })
})
