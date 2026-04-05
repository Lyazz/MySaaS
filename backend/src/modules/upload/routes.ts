import { Router } from 'express'
import multer from 'multer'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { UploadController } from './upload.controller'
import { uploadErrorMiddleware } from './upload.error-middleware'

const router = Router()
const controller = new UploadController()

// Configure multer to store file in memory and validate uploads early
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file is enough for product imagery
        files: 1
    },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image uploads are allowed'))
        }
        cb(null, true)
    }
})

router.post('/', requireTenantAdmin, upload.single('file'), controller.upload.bind(controller))
router.use(uploadErrorMiddleware)

export default router

