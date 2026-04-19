import { defineStore } from 'pinia'
import { getJwtExpiryEpochMs, isJwtExpired } from '~/shared/auth/session-token'

interface User {
    id: string
    email: string
    role: string
    isSuperAdmin?: boolean
    tenantId: string
    staffRoleId?: string | null
    tenant?: {
        id: string
        name: string
        slug: string
        isOffline?: boolean
    }
}

interface StaffRoleInfo {
    id: string
    name: string
}

export const useAuthStore = defineStore('auth', () => {
    const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

    const user = ref<User | null>(null)
    const token = useCookie<string | null>('auth_token', {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: AUTH_SESSION_MAX_AGE_SECONDS
    })
    const staffRole = ref<StaffRoleInfo | null>(null)
    const staffPermissions = ref<string[] | null>(null)
    let expiryTimer: ReturnType<typeof setTimeout> | null = null

    const isAuthenticated = computed(() => !!token.value && !isJwtExpired(token.value))

    const clearAuthState = () => {
        if (expiryTimer) {
            clearTimeout(expiryTimer)
            expiryTimer = null
        }
        token.value = null
        user.value = null
        staffRole.value = null
        staffPermissions.value = null
    }

    const resolveLoginPath = () => {
        if (process.server) return '/login'
        return window.location.pathname.startsWith('/super-admin') ? '/super-admin/login' : '/login'
    }

    const shouldRedirectToLogin = () => {
        if (process.server) return false
        const path = window.location.pathname
        return path.startsWith('/admin') || path.startsWith('/super-admin')
    }

    const scheduleSessionExpiry = () => {
        if (!process.client) return

        if (expiryTimer) {
            clearTimeout(expiryTimer)
            expiryTimer = null
        }

        const currentToken = token.value
        if (!currentToken) return

        const expiryMs = getJwtExpiryEpochMs(currentToken)
        if (!expiryMs) return

        const timeoutMs = expiryMs - Date.now()
        if (timeoutMs <= 0) {
            clearAuthState()
            if (shouldRedirectToLogin()) {
                navigateTo(resolveLoginPath())
            }
            return
        }

        expiryTimer = setTimeout(() => {
            if (!token.value || !isJwtExpired(token.value, Date.now(), 0)) return
            clearAuthState()
            if (shouldRedirectToLogin()) {
                navigateTo(resolveLoginPath())
            }
        }, timeoutMs)
    }

    async function login(email: string, password: string): Promise<boolean> {
        try {
            const data = await $fetch('/api/login', {
                method: 'POST',
                body: { email, password }
            }) as any

            if (data && data.success) {
                token.value = data.token
                user.value = {
                    ...data.user,
                    tenant: data.tenant || data.user.tenant
                }
                staffRole.value = data.staffRole ?? null
                staffPermissions.value = data.staffPermissions ?? null
                return true
            }
            return false
        } catch (e: any) {
            console.error('[Auth Store] Login failed')
            return false
        }
    }

    function logout(opts?: { redirect?: boolean }) {
        clearAuthState()
        if (opts?.redirect !== false) {
            navigateTo(resolveLoginPath())
        }
    }

    function ensureSessionActive() {
        if (!token.value) return false
        if (!isJwtExpired(token.value)) return true

        clearAuthState()
        return false
    }

    function setAuth(newToken: string, newUser: User, tenant?: any, nextStaffRole?: StaffRoleInfo | null, nextStaffPermissions?: string[] | null) {
        token.value = newToken
        user.value = {
            ...newUser,
            tenant
        }
        staffRole.value = nextStaffRole ?? null
        staffPermissions.value = nextStaffPermissions ?? null
    }

    if (process.client) {
        watch(token, () => {
            scheduleSessionExpiry()
        }, { immediate: true })
    }

    return {
        user,
        token,
        staffRole,
        staffPermissions,
        isAuthenticated,
        login,
        logout,
        setAuth,
        ensureSessionActive
    }
})
