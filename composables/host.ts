type HostParts = { hostname: string; port?: string }

const splitHost = (hostWithPort: string): HostParts => {
  const first = hostWithPort.split(',')[0]?.trim() ?? ''
  if (!first) return { hostname: '' }

  // Bracketed IPv6: [::1]:3000
  if (first.startsWith('[')) {
    const bracketEnd = first.indexOf(']')
    if (bracketEnd === -1) return { hostname: first }
    const hostname = first.slice(0, bracketEnd + 1)
    const rest = first.slice(bracketEnd + 1)
    const port = rest.startsWith(':') ? rest.slice(1) : undefined
    return { hostname, port }
  }

  const parts = first.split(':')
  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1] ?? '')) {
    return { hostname: parts.slice(0, -1).join(':'), port: parts[parts.length - 1] }
  }

  return { hostname: first }
}

export const useRequestOrigin = (): { protocol: string; host: string } => {
  if (process.server) {
    const headers = useRequestHeaders(['x-forwarded-host', 'host', 'x-forwarded-proto'])
    const host = (headers['x-forwarded-host'] || headers['host'] || '').toString()
    const protocol = (headers['x-forwarded-proto'] || 'http').toString()
    return { protocol, host }
  }

  return { protocol: window.location.protocol.replace(':', ''), host: window.location.host }
}

export const toSaasHost = (
  hostWithPort: string,
  opts?: { platformBaseDomain?: string }
): string | null => {
  const platformBaseDomain = (opts?.platformBaseDomain ?? 'platform.com').toLowerCase()
  const { hostname, port } = splitHost(hostWithPort)
  const lower = hostname.toLowerCase()

  let saasHostname: string | null = null
  if (lower.endsWith('.localhost')) saasHostname = 'localhost'
  else if (lower.endsWith(`.${platformBaseDomain}`)) saasHostname = platformBaseDomain

  if (!saasHostname) return null
  return port ? `${saasHostname}:${port}` : saasHostname
}

export const toTenantHost = (
  saasHostWithPort: string,
  tenantSlug: string,
  opts?: { platformBaseDomain?: string }
): string => {
  const platformBaseDomain = (opts?.platformBaseDomain ?? 'platform.com').toLowerCase()
  const { hostname, port } = splitHost(saasHostWithPort)
  const lower = hostname.toLowerCase()

  const baseHostname = lower === `www.${platformBaseDomain}` ? platformBaseDomain : hostname
  const tenantHostname =
    baseHostname.toLowerCase() === 'localhost' ? `${tenantSlug}.localhost` : `${tenantSlug}.${baseHostname}`

  return port ? `${tenantHostname}:${port}` : tenantHostname
}

