export const usePlatformBaseDomain = (): string => {
  const config = useRuntimeConfig()
  const raw = (config.public?.platformBaseDomain || '').toString().trim().toLowerCase()
  return raw || 'platform.com'
}

