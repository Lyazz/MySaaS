export class YalidineIntegrationError extends Error {
    statusCode: number
    statusMessage: string
    code?: string
    details?: unknown

    constructor(input: { statusCode: number; statusMessage: string; code?: string; details?: unknown }) {
        super(input.statusMessage)
        this.statusCode = input.statusCode
        this.statusMessage = input.statusMessage
        this.code = input.code
        this.details = input.details
    }
}

