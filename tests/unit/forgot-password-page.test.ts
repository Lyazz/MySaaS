import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import ForgotPassword from '../../pages/forgot-password.vue'

/**
 * The reset screen walks three steps on one page, and each one only appears
 * once the previous call succeeded. Mounting it against a stubbed `$fetch` is
 * the cheapest way to hold that ordering still — and to pin the two rules the
 * markup itself is responsible for: only offer channels the server advertised,
 * and never send a mismatched password to the API.
 */

vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        // Keys, not prose: the assertions below should not move when the copy does.
        t: (key: string) => key
    })
}))

const stubs = {
    NuxtLink: { template: '<a><slot /></a>' },
    Icon: true
}

type FetchCall = { path: string; body: any }

let calls: FetchCall[] = []
let channels: string[] = []

const mountPage = async () => {
    const wrapper = mount(ForgotPassword, { global: { stubs } })
    await flushPromises()
    return wrapper
}

beforeEach(() => {
    calls = []
    channels = ['EMAIL', 'SMS', 'WHATSAPP']

    vi.stubGlobal('$fetch', vi.fn(async (path: string, options?: any) => {
        calls.push({ path, body: options?.body })

        if (path === '/api/auth/otp/channels') {
            return { channels, codeLength: 6, expiresInMinutes: 10, resendAfterSeconds: 60 }
        }

        if (path === '/api/auth/password/forgot') {
            return { success: true, maskedDestination: 'o•••@example.com', resendAfterSeconds: 60 }
        }

        if (path === '/api/auth/otp/verify') {
            return { success: true, verificationToken: 'token-abc' }
        }

        return { success: true }
    }))
})

describe('forgot-password page', () => {
    it('offers exactly the channels the server advertised', async () => {
        channels = ['EMAIL', 'WHATSAPP']
        const wrapper = await mountPage()

        expect(wrapper.find('[data-testid="forgot-channel-email"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="forgot-channel-whatsapp"]').exists()).toBe(true)
        // SMS was not on offer, so it must not be a button the visitor can pick.
        expect(wrapper.find('[data-testid="forgot-channel-sms"]').exists()).toBe(false)
    })

    it('swaps the email field for a phone field on a phone channel', async () => {
        const wrapper = await mountPage()

        expect(wrapper.find('[data-testid="forgot-email"]').exists()).toBe(true)

        await wrapper.get('[data-testid="forgot-channel-sms"]').trigger('click')

        expect(wrapper.find('[data-testid="forgot-email"]').exists()).toBe(false)
        expect(wrapper.find('[data-testid="forgot-phone"]').exists()).toBe(true)
    })

    it('walks send → verify → new password → done', async () => {
        const wrapper = await mountPage()

        await wrapper.get('[data-testid="forgot-email"]').setValue('owner@example.com')
        await wrapper.get('[data-testid="forgot-send"]').trigger('submit')
        await flushPromises()

        // Step two: the code field, and the request that got us here.
        expect(wrapper.find('[data-testid="forgot-code"]').exists()).toBe(true)
        expect(calls.at(-1)).toMatchObject({
            path: '/api/auth/password/forgot',
            body: { channel: 'EMAIL', email: 'owner@example.com' }
        })

        await wrapper.get('[data-testid="forgot-code"]').setValue('123456')
        await wrapper.get('[data-testid="forgot-verify"]').trigger('submit')
        await flushPromises()

        expect(wrapper.find('[data-testid="forgot-password"]').exists()).toBe(true)
        expect(calls.at(-1)).toMatchObject({
            path: '/api/auth/otp/verify',
            body: { purpose: 'PASSWORD_RESET', code: '123456' }
        })

        await wrapper.get('[data-testid="forgot-password"]').setValue('LongEnough123!')
        await wrapper.get('[data-testid="forgot-confirm"]').setValue('LongEnough123!')
        await wrapper.get('[data-testid="forgot-submit"]').trigger('submit')
        await flushPromises()

        // The token, not the address, is what buys the password change.
        expect(calls.at(-1)).toMatchObject({
            path: '/api/auth/password/reset',
            body: { verificationToken: 'token-abc', password: 'LongEnough123!' }
        })
        expect(wrapper.find('[data-testid="forgot-go-login"]').exists()).toBe(true)
    })

    it('refuses a mismatched confirmation without calling the API', async () => {
        const wrapper = await mountPage()

        await wrapper.get('[data-testid="forgot-email"]').setValue('owner@example.com')
        await wrapper.get('[data-testid="forgot-send"]').trigger('submit')
        await flushPromises()
        await wrapper.get('[data-testid="forgot-code"]').setValue('123456')
        await wrapper.get('[data-testid="forgot-verify"]').trigger('submit')
        await flushPromises()

        await wrapper.get('[data-testid="forgot-password"]').setValue('LongEnough123!')
        await wrapper.get('[data-testid="forgot-confirm"]').setValue('SomethingElse123!')
        await wrapper.get('[data-testid="forgot-submit"]').trigger('submit')
        await flushPromises()

        expect(calls.some((call) => call.path === '/api/auth/password/reset')).toBe(false)
        expect(wrapper.get('[data-testid="forgot-feedback"]').text()).toContain('passwordMismatch')
    })

    it('can go back and re-address the code, dropping the old one', async () => {
        const wrapper = await mountPage()

        await wrapper.get('[data-testid="forgot-email"]').setValue('owner@example.com')
        await wrapper.get('[data-testid="forgot-send"]').trigger('submit')
        await flushPromises()
        expect(wrapper.find('[data-testid="forgot-code"]').exists()).toBe(true)

        await wrapper.get('[data-testid="forgot-change-destination"]').trigger('click')
        await flushPromises()

        // Step one again, with the code that went to the old address dropped.
        expect(wrapper.find('[data-testid="forgot-code"]').exists()).toBe(false)
        expect(wrapper.find('[data-testid="forgot-send"]').exists()).toBe(true)

        await wrapper.get('[data-testid="forgot-channel-sms"]').trigger('click')
        await wrapper.get('[data-testid="forgot-phone"]').setValue('0550123456')
        await wrapper.get('[data-testid="forgot-send"]').trigger('submit')
        await flushPromises()

        expect(calls.at(-1)).toMatchObject({
            path: '/api/auth/password/forgot',
            body: { channel: 'SMS', phone: '0550123456' }
        })
    })
})
