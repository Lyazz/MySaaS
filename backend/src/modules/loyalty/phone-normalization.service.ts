export class PhoneNormalizationError extends Error {
    statusCode: number
    statusMessage: string

    constructor(statusMessage: string) {
        super(statusMessage)
        this.statusCode = 400
        this.statusMessage = statusMessage
    }
}

export type NormalizedPhoneResult = {
    raw: string
    digits: string
    normalized: string
    internationalDisplay: string
}

const stripDigits = (value: string) => value.replace(/\D/g, '')

export class PhoneNormalizationService {
    normalizeAlgerianPhone(input: unknown, fieldLabel = 'phone'): NormalizedPhoneResult {
        const raw = typeof input === 'string' ? input.trim() : ''
        if (!raw) {
            throw new PhoneNormalizationError(`${fieldLabel} is required`)
        }

        const digits = stripDigits(raw)
        if (!digits) {
            throw new PhoneNormalizationError(`${fieldLabel} is invalid`)
        }

        let normalized: string | null = null
        if (/^0[567]\d{8}$/.test(digits)) {
            normalized = `213${digits.slice(1)}`
        } else if (/^[567]\d{8}$/.test(digits)) {
            normalized = `213${digits}`
        } else if (/^213[567]\d{8}$/.test(digits)) {
            normalized = digits
        } else if (/^00213[567]\d{8}$/.test(digits)) {
            normalized = digits.slice(2)
        }

        if (!normalized) {
            throw new PhoneNormalizationError(`${fieldLabel} must be a valid Algerian phone number`)
        }

        return {
            raw,
            digits,
            normalized,
            internationalDisplay: `+${normalized}`
        }
    }

    tryNormalizeAlgerianPhone(input: unknown): NormalizedPhoneResult | null {
        try {
            return this.normalizeAlgerianPhone(input)
        } catch {
            return null
        }
    }
}

