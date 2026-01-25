const normalizePath = (path: string): string => (path.startsWith('/') ? path : `/${path}`)

export const useTenantApiUrl = (path: string): string => {
  const normalized = normalizePath(path)

  if (!process.server) return normalized

  // Avoid server-side DNS lookups for tenant subdomains/custom domains.
  // In local dev, `foo.localhost` resolves in browsers but not in Node DNS by default.
  // We call the local server and forward `x-forwarded-host` to preserve tenant context.
  const requestUrl = useRequestURL()
  const envPort = process.env.PORT || process.env.NITRO_PORT || process.env.NUXT_PORT
  const port = requestUrl.port || envPort || '3000'
  const portSuffix = port ? `:${port}` : ''

  return `http://127.0.0.1${portSuffix}${normalized}`
}

export const useTenantApiHeaders = (): Record<string, string> | undefined => {
  if (!process.server) return
  const headers = useRequestHeaders(['x-forwarded-host', 'host'])
  const forwardedHost = (headers['x-forwarded-host'] || headers['host'] || '').toString()
  if (!forwardedHost) return
  return { 'x-forwarded-host': forwardedHost }
}
