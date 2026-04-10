export type MaystroOrderErrorCode =
    | 10
    | 20
    | 30
    | 40
    | 45
    | 50
    | 55
    | 60
    | 70
    | 80
    | 90
    | 100
    | 101

export class MaystroIntegrationError extends Error {
    statusCode: number
    statusMessage: string
    code?: MaystroOrderErrorCode | string
    details?: unknown

    constructor(input: {
        statusCode: number
        statusMessage: string
        code?: MaystroOrderErrorCode | string
        details?: unknown
    }) {
        super(input.statusMessage)
        this.statusCode = input.statusCode
        this.statusMessage = input.statusMessage
        this.code = input.code
        this.details = input.details
    }
}

export const mapMaystroOrderErrorCode = (code: number): { statusCode: number; statusMessage: string } => {
    switch (code as MaystroOrderErrorCode) {
        case 10:
            return { statusCode: 400, statusMessage: 'Maystro: invalid order price' }
        case 20:
            return { statusCode: 400, statusMessage: 'Maystro: missing address' }
        case 30:
            return { statusCode: 400, statusMessage: 'Maystro: invalid customer data' }
        case 40:
            return { statusCode: 400, statusMessage: 'Maystro: invalid wilaya/commune' }
        case 45:
            return { statusCode: 400, statusMessage: 'Maystro: invalid delivery type for commune' }
        case 50:
            return { statusCode: 400, statusMessage: 'Maystro: invalid order details/products' }
        case 55:
            return { statusCode: 409, statusMessage: 'Maystro: duplicated order (last 24h)' }
        case 60:
            return { statusCode: 502, statusMessage: 'Maystro: unexpected error' }
        case 70:
            return { statusCode: 400, statusMessage: 'Maystro: delivery pricing/fees could not be detected' }
        case 80:
            return { statusCode: 400, statusMessage: 'Maystro: bulk orders list is empty' }
        case 90:
            return { statusCode: 400, statusMessage: 'Maystro: bulk orders exceeded 100' }
        case 100:
            return { statusCode: 400, statusMessage: 'Maystro: external_id too long (max 110)' }
        case 101:
            return { statusCode: 400, statusMessage: 'Maystro: insufficient points' }
        default:
            return { statusCode: 502, statusMessage: 'Maystro: unknown error' }
    }
}

