import multer from 'multer'
import type { ErrorRequestHandler } from 'express'

export const uploadErrorMiddleware: ErrorRequestHandler = (err, _req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Image must be less than 5 MB' })
        }

        return res.status(400).json({ error: err.message })
    }

    if (err instanceof Error && err.message === 'Only image uploads are allowed') {
        return res.status(400).json({ error: err.message })
    }

    return next(err)
}
