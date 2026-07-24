// Simulate MaystroIntegrationError
class MaystroIntegrationError extends Error {
    statusCode: number
    statusMessage: string
    code?: string

    constructor(input: { statusCode: number; statusMessage: string; code?: string }) {
        super(input.statusMessage)
        this.name = 'MaystroIntegrationError'
        this.statusCode = input.statusCode
        this.statusMessage = input.statusMessage
        this.code = input.code
    }
}

// Simulate the route handler
async function handleRequest() {
    try {
        // Simulate throwing inside the service
        throw new MaystroIntegrationError({
            statusCode: 400,
            statusMessage: 'Failed to link existing product: could not find "x" across all pages'
        })
    } catch (error: any) {
        if (error instanceof MaystroIntegrationError || error.name === 'MaystroIntegrationError') {
            return {
                statusCode: error.statusCode,
                statusMessage: error.statusMessage,
                code: error.code
            }
        }
        return { statusCode: 500, message: 'Internal Server Error', debug: String(error) }
    }
}

handleRequest().then(console.log)
