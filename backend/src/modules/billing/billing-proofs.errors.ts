export class BillingProofValidationError extends Error {
    statusCode = 400
}

export class BillingProofNotFoundError extends Error {
    statusCode = 404
}

