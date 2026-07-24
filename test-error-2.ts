import { MaystroIntegrationError } from './backend/src/modules/delivery/maystro/maystro.errors'

try {
    throw new MaystroIntegrationError({
        statusCode: 400,
        statusMessage: 'Maystro request failed (Some detail)',
        code: 55
    })
} catch (err: any) {
    console.log('Caught Error Class:', err.constructor.name)
    console.log('err.message:', err.message)
    console.log('err.statusMessage:', err.statusMessage)
    console.log('err.code:', err.code)
}
