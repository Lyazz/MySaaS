import { defineStore } from 'pinia'

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
    const user = ref<User | null>(null)
    const token = useCookie<string | null>('auth_token')
    const staffRole = ref<StaffRoleInfo | null>(null)
    const staffPermissions = ref<string[] | null>(null)

    const isAuthenticated = computed(() => !!token.value)

    async function login(email: string, password: string): Promise<boolean> {
        console.log('[Auth Store] logging in with', email)
        try {
            const data = await $fetch('/api/login', {
                method: 'POST',
                body: { email, password }
            }) as any

            console.log('[Auth Store] Login success data:', data)

            if (data && data.success) {
                token.value = data.token
                user.value = {
                    ...data.user,
                    tenant: data.tenant || data.user.tenant
                }
                staffRole.value = data.staffRole ?? null
                staffPermissions.value = data.staffPermissions ?? null
                console.log('[Auth Store] Token set, returning true')
                return true
            }
            return false
        } catch (e: any) {
            console.error('[Auth Store] Login failed exception', e)
            return false
        }
    }

    function logout() {
        token.value = null
        user.value = null
        staffRole.value = null
        staffPermissions.value = null
        navigateTo('/login')
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

    return {
        user,
        token,
        staffRole,
        staffPermissions,
        isAuthenticated,
        login,
        logout,
        setAuth
    }
})
