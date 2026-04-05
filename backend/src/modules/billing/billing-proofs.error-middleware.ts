import multer from 'multer'
import type { ErrorRequestHandler } from 'express'

export const billingProofsUploadErrorMiddleware: ErrorRequestHandler = (err, _req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ statusCode: 400, statusMessage: err.message })
    }

    if (err instanceof Error && err.message === 'Only proof uploads are allowed') {
        return res.status(400).json({ statusCode: 400, statusMessage: err.message })
    }

    return next(err)
}

