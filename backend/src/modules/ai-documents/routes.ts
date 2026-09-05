import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { AiDocumentsController } from './ai-documents.controller'
import { ALLOWED_DOCUMENT_MIMES } from './document-storage.service'

const router = Router()
const controller = new AiDocumentsController()

router.use(requireTenantMember)
// Importing a scanned document writes purchase orders; creating products from
// unmatched lines is checked separately in the controller.
router.use(requireStaffCrud('purchases'))

const documentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const ok =
            (ALLOWED_DOCUMENT_MIMES as readonly string[]).includes(file.mimetype) ||
            file.originalname.toLowerCase().endsWith('.pdf')
        if (!ok) return cb(new Error('Only PNG, JPEG, WebP and PDF documents are supported'))
        cb(null, true)
    }
})

const uploadErrorMiddleware = (err: any, _req: Request, res: Response, next: NextFunction) => {
    if (!err) return next()
    if (err?.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ statusCode: 400, statusMessage: 'Document must be less than 10 MB' })
    }
    if (err instanceof Error && err.message.startsWith('Only PNG')) {
        return res.status(400).json({ statusCode: 400, statusMessage: err.message })
    }
    return next(err)
}

router.get('/', controller.list.bind(controller))
router.post('/', documentUpload.single('file'), controller.create.bind(controller))
router.get('/:id', controller.getById.bind(controller))
router.get('/:id/stream', controller.stream.bind(controller))
router.get('/:id/document-url', controller.documentUrl.bind(controller))
router.patch('/:id/draft', controller.patchDraft.bind(controller))
router.post('/:id/confirm', controller.confirm.bind(controller))
router.delete('/:id', controller.cancel.bind(controller))

router.use(uploadErrorMiddleware)

export default router
