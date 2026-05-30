import { describe, expect, it } from 'vitest'
import { extractApiErrorMessage } from '../../shared/http/error-message'

describe('extractApiErrorMessage', () => {
    it('returns nested data.statusMessage when available', () => {
        const message = extractApiErrorMessage(
            { data: { statusMessage: 'Tenant not found' } },
            'fallback'
        )

        expect(message).toBe('Tenant not found')
    })

    it('falls back to response.data.message and top-level message in order', () => {
        const fromResponse = extractApiErrorMessage(
            { response: { data: { message: 'Access denied' } } },
            'fallback'
        )
        const fromTopLevel = extractApiErrorMessage(
            { message: 'Network failed' },
            'fallback'
        )

        expect(fromResponse).toBe('Access denied')
        expect(fromTopLevel).toBe('Network failed')
    })

    it('returns fallback when no candidate message exists', () => {
        const message = extractApiErrorMessage(
            { data: { statusMessage: '   ' } },
            'fallback'
        )

        expect(message).toBe('fallback')
    })
})
