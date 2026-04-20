import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
    navigateToMock,
    useStateMock,
    defineNuxtRouteMiddlewareMock,
    useAuthStoreMock,
    toSaasHostMock,
    useRequestOriginMock,
    usePlatformBaseDomainMock
} = vi.hoisted(() => ({
    navigateToMock: vi.fn(),
    useStateMock: vi.fn(),
    defineNuxtRouteMiddlewareMock: vi.fn((fn: any) => fn),
    useAuthStoreMock: vi.fn(),
    toSaasHostMock: vi.fn(),
    useRequestOriginMock: vi.fn(),
    usePlatformBaseDomainMock: vi.fn()
}))

mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useState', () => useStateMock)
mockNuxtImport('defineNuxtRouteMiddleware', () => defineNuxtRouteMiddlewareMock)

vi.mock('~/stores/auth', () => ({
    useAuthStore: useAuthStoreMock
}))

vi.mock('~/composables/host', () => ({
    toSaasHost: toSaasHostMock,
    useRequestOrigin: useRequestOriginMock
}))

vi.mock('~/composables/platformBaseDomain', () => ({
    usePlatformBaseDomain: usePlatformBaseDomainMock
}))

describe('admin auth middleware', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.clearAllMocks()

        toSaasHostMock.mockReturnValue('platform.localhost:3000')
        useRequestOriginMock.mockReturnValue({ protocol: 'https', host: 'acme.localhost:3000' })
        usePlatformBaseDomainMock.mockReturnValue('localhost')
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('redirects expired tenant-admin sessions to SaaS login with tenant + next params', async () => {
        useAuthStoreMock.mockReturnValue({
            ensureSessionActive: vi.fn(() => false),
            user: null
        })
        useStateMock.mockReturnValue({ value: { slug: 'acme' } })

        const middleware = (await import('~/middleware/auth')).default
        await middleware({ path: '/admin/orders', fullPath: '/admin/orders' } as any, {} as any)

        expect(navigateToMock).toHaveBeenCalledWith(
            'https://platform.localhost:3000/login?tenant=acme&next=%2Fadmin%2Forders',
            { external: true }
        )
    })

    it('redirects inactive non-tenant admin sessions to /login', async () => {
        useAuthStoreMock.mockReturnValue({
            ensureSessionActive: vi.fn(() => false),
            user: null
        })
        useStateMock.mockReturnValue({ value: null })

        const middleware = (await import('~/middleware/auth')).default
        await middleware({ path: '/admin/products', fullPath: '/admin/products' } as any, {} as any)

        expect(navigateToMock).toHaveBeenCalledWith('/login')
    })

    it('redirects super-admin users away from tenant admin routes', async () => {
        useAuthStoreMock.mockReturnValue({
            ensureSessionActive: vi.fn(() => true),
            user: { isSuperAdmin: true }
        })
        useStateMock.mockReturnValue({ value: { slug: 'acme' } })

        const middleware = (await import('~/middleware/auth')).default
        await middleware({ path: '/admin', fullPath: '/admin' } as any, {} as any)

        expect(navigateToMock).toHaveBeenCalledWith('/super-admin')
    })

    it('does not run tenant admin checks for non-admin routes', async () => {
        const ensureSessionActive = vi.fn(() => false)
        useAuthStoreMock.mockReturnValue({
            ensureSessionActive,
            user: null
        })
        useStateMock.mockReturnValue({ value: { slug: 'acme' } })

        const middleware = (await import('~/middleware/auth')).default
        await middleware({ path: '/products', fullPath: '/products' } as any, {} as any)

        expect(ensureSessionActive).not.toHaveBeenCalled()
        expect(navigateToMock).not.toHaveBeenCalled()
    })
})
