export const useTenantSeo = (params?: { title?: string; description?: string; image?: string }) => {
    const url = useRequestURL()
    const route = useRoute()
    const headers = useRequestHeaders(['x-forwarded-host', 'host', 'x-forwarded-proto'])

    // Construct canonical URL
    // If we assume the host is correct (handled by middleware or infrastructure)
    // we can just use the current request URL, but ensure we strip query params if needed
    // or just use the path.
    // Spec says: "Canonical URL per page, per tenant host"

    const canonicalPath = route.path
    // Remove trailing slash if present, unless it's root
    const cleanPath = canonicalPath === '/' ? '/' : canonicalPath.replace(/\/$/, '')

    const resolvedHost = (headers['x-forwarded-host'] || headers['host'] || url.host || '').toString()
    const resolvedProto = (headers['x-forwarded-proto'] || url.protocol || 'http').toString().replace(':', '')
    const canonicalUrl = `${resolvedProto}://${resolvedHost}${cleanPath}`

    // Set SEO Meta
    useSeoMeta({
        title: params?.title,
        ogTitle: params?.title,
        description: params?.description,
        ogDescription: params?.description,
        ogImage: params?.image,
    })

    useHead({
        link: [
            { rel: 'canonical', href: canonicalUrl }
        ]
    })

    // Optional: Add more structured data here if needed
    return {
        canonicalUrl
    }
}
