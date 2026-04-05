export class UploadValidationError extends Error {
    statusCode = 400
}

export class StorageUnavailableError extends Error {
    statusCode = 503
}

