import { defineStore } from 'pinia'

interface User {
    id: string
    email: string
    role: string
    isSuperAdmin?: boolean
    tenantId: string
    tenant?: {
        id: string
        name: string
        slug: string
    }
}

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const token = useCookie<string | null>('auth_token')

    const isAuthenticated = computed(() => !!token.value)

    async function login(email: string, password: string): Promise<boolean> {
        console.log('[Auth Store] logging in with', email)
        try {
            const data = await $fetch<any>('/api/login', {
                method: 'POST',
                body: { email, password }
            })

            console.log('[Auth Store] Login success data:', data)

            if (data && data.success) {
                token.value = data.token
                user.value = data.user
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
        navigateTo('/login')
    }

    function setAuth(newToken: string, newUser: User, tenant?: any) {
        token.value = newToken
        user.value = {
            ...newUser,
            tenant
        }
    }

    return {
        user,
        token,
        isAuthenticated,
        login,
        logout,
        setAuth
    }
})
