import { toSaasHost, useRequestOrigin } from '~/composables/host'

export default defineNuxtRouteMiddleware((to) => {
  const tenant = useState<any>('tenant')
  if (!tenant.value) return

  const { protocol, host } = useRequestOrigin()
  const saasHost = toSaasHost(host)
  if (!saasHost) return

  return navigateTo(`${protocol}://${saasHost}${to.fullPath}`, { external: true })
})

