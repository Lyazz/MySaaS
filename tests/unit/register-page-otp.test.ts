import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import Register from '../../pages/register.vue'

/**
 * The signup screen's verification block, which is the half of `/register` that
 * can fail silently: a channel button that renders but is not wired, or a
 * submit that stays disabled after a successful verify, both look fine in a
 * screenshot and block every new tenant.
 */

vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key })
}))

vi.mock('~/stores/auth', () => ({
    useAuthStore: () => ({ setAuth: vi.fn() })
}))

vi.mock('~/composables/platformBaseDomain', () => ({
    usePlatformBaseDomain: () => 'swekly.com'
}))

const stubs = {
    NuxtLink: { template: '<a><slot /></a>' },
    Icon: true,
    SaaSLogo: true
}

let channels: string[] = []
let calls: Array<{ path: string; body: any }> = []

const mountPage = async () => {
    const wrapper = mount(Register, { global: { stubs } })
    await flushPromises()
    return wrapper
}

beforeEach(() => {
    calls = []
    channels = ['EMAIL', 'SMS']

    vi.stubGlobal('useRuntimeConfig', () => ({ public: { registrationsOpen: true } }))

    vi.stubGlobal('$fetch', vi.fn(async (path: string, options?: any) => {
        calls.push({ path, body: options?.body })

        if (path === '/api/auth/otp/channels') {
            return { channels, codeLength: 6, expiresInMinutes: 10, resendAfterSeconds: 60 }
        }

        if (path === '/api/auth/otp/send') {
            return { success: true, maskedDestination: 'o•••@example.com', resendAfterSeconds: 60 }
        }

        if (path === '/api/auth/otp/verify') {
            return { success: true, verificationToken: 'signup-token' }
        }

        return {
            success: true,
            token: 'jwt',
            user: { id: 'u1' },
            tenant: { id: 't1' },
            onboarding: { required: true }
        }
    }))
})

describe('register page verification block', () => {
    it('renders one button per advertised channel', async () => {
        const wrapper = await mountPage()

        expect(wrapper.find('[data-testid="register-channel-email"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="register-channel-sms"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="register-channel-whatsapp"]').exists()).toBe(false)
    })

    it('hides the block entirely when no channel can deliver', async () => {
        channels = []
        const wrapper = await mountPage()

        // Nothing to verify with, so the server is left to decide; parking the
        // visitor at a dead "send code" button would strand every signup.
        expect(wrapper.find('[data-testid="register-otp"]').exists()).toBe(false)
        expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    })

    it('sends to the email on the email channel and to the phone on SMS', async () => {
        const wrapper = await mountPage()

        await wrapper.get('[data-testid="register-email"]').setValue('owner@example.com')
        await wrapper.get('[data-testid="register-phone"]').setValue('0550123456')
        await wrapper.get('[data-testid="register-send-otp"]').trigger('click')
        await flushPromises()

        expect(calls.at(-1)).toMatchObject({
            path: '/api/auth/otp/send',
            body: { purpose: 'REGISTRATION', channel: 'EMAIL', email: 'owner@example.com' }
        })

        await wrapper.get('[data-testid="register-channel-sms"]').trigger('click')
        await flushPromises()
        await wrapper.get('[data-testid="register-send-otp"]').trigger('click')
        await flushPromises()

        expect(calls.at(-1)).toMatchObject({
            path: '/api/auth/otp/send',
            body: { channel: 'SMS', phone: '0550123456' }
        })
    })

    it('carries the verified token into the signup request', async () => {
        const wrapper = await mountPage()

        await wrapper.get('[data-testid="register-company"]').setValue('Ma Boutique')
        await wrapper.get('[data-testid="register-email"]').setValue('owner@example.com')
        await wrapper.get('[data-testid="register-phone"]').setValue('0550123456')
        await wrapper.get('[data-testid="register-send-otp"]').trigger('click')
        await flushPromises()

        // Submit is refused until the code has actually been verified.
        expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

        await wrapper.get('[data-testid="register-otp"]').setValue('123456')
        await wrapper.get('[data-testid="register-verify-otp"]').trigger('click')
        await flushPromises()

        await wrapper.get('[data-testid="register-password"]').setValue('Password123!')
        await wrapper.get('[data-testid="register-confirm-password"]').setValue('Password123!')
        await wrapper.get('button[type="submit"]').trigger('submit')
        await flushPromises()

        expect(calls.at(-1)).toMatchObject({
            path: '/api/register',
            body: { verificationToken: 'signup-token', email: 'owner@example.com' }
        })
    })
})
