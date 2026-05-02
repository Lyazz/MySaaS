export class ProductWorkflowError extends Error {
    statusCode: number
    statusMessage: string
    code: string
    details?: Record<string, unknown>

    constructor(statusCode: number, code: string, statusMessage: string, details?: Record<string, unknown>) {
        super(statusMessage)
        this.statusCode = statusCode
        this.statusMessage = statusMessage
        this.code = code
        this.details = details
    }
}
