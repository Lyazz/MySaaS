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
    const sessionNowMs = ref(Date.now())
    let expiryTimer: ReturnType<typeof setTimeout> | null = null
    let hasBoundSessionEvents = false

    const isAuthenticated = computed(() => !!token.value && !isJwtExpired(token.value, sessionNowMs.value))

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

    const updateSessionNow = () => {
        sessionNowMs.value = Date.now()
    }

    const expireSession = (opts?: { redirect?: boolean }) => {
        clearAuthState()
        if (opts?.redirect && shouldRedirectToLogin()) {
            navigateTo(resolveLoginPath())
        }
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
        if (!expiryMs) {
            expireSession({ redirect: true })
            return
        }

        const timeoutMs = expiryMs - Date.now()
        if (timeoutMs <= 0) {
            expireSession({ redirect: true })
            return
        }

        expiryTimer = setTimeout(() => {
            ensureSessionActive({ redirectIfExpired: true })
        }, timeoutMs)
    }

    const validateSessionOnClient = () => {
        if (!process.client) return
        ensureSessionActive({ redirectIfExpired: true })
    }

    const startSessionValidation = () => {
        if (!process.client || hasBoundSessionEvents) return
        hasBoundSessionEvents = true

        const onVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return
            validateSessionOnClient()
        }
        const onFocus = () => {
            validateSessionOnClient()
        }

        document.addEventListener('visibilitychange', onVisibilityChange)
        window.addEventListener('focus', onFocus)

        validateSessionOnClient()
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
        } catch {
            console.error('[Auth Store] Login failed')
            return false
        }
    }

    function logout(opts?: { redirect?: boolean; revoke?: boolean }) {
        const currentToken = token.value
        if (opts?.revoke !== false && process.client && currentToken) {
            const url = useTenantApiUrl('/api/logout')
            void $fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                    ...(useTenantApiHeaders() || {})
                }
            }).catch(() => {})
        }

        clearAuthState()
        if (opts?.redirect !== false) {
            navigateTo(resolveLoginPath())
        }
    }

    function ensureSessionActive(opts?: { redirectIfExpired?: boolean }) {
        updateSessionNow()

        if (!token.value) {
            if (user.value || staffRole.value || staffPermissions.value) {
                clearAuthState()
            }
            if (opts?.redirectIfExpired && shouldRedirectToLogin()) {
                navigateTo(resolveLoginPath())
            }
            return false
        }
        if (!isJwtExpired(token.value, sessionNowMs.value)) return true

        expireSession({ redirect: opts?.redirectIfExpired })
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
        startSessionValidation()
        watch(token, () => {
            updateSessionNow()
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
