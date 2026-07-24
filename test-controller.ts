import { MaystroIntegrationError } from './backend/src/modules/delivery/maystro/maystro.errors'
import { DeliveryConfigurationError } from './backend/src/modules/delivery/delivery.errors'

// Simulate the compiled environment by messing up prototype chain
class BrokenMaystroError extends Error {
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

function testControllerErrorHandling(error: any) {
    if (error instanceof DeliveryConfigurationError || error.name === 'DeliveryConfigurationError') {
        return { statusCode: error.statusCode, statusMessage: error.statusMessage }
    }
    if (error instanceof MaystroIntegrationError || error.name === 'MaystroIntegrationError') {
        return { statusCode: error.statusCode, statusMessage: error.statusMessage, code: error.code }
    }
    return { statusCode: 500, message: 'Internal Server Error' }
}

const err = new BrokenMaystroError({
    statusCode: 400,
    statusMessage: 'Failed to link existing product: could not find "iPhone" across all pages in Maystro catalog',
    code: '55'
})

console.log('Result:', testControllerErrorHandling(err))
