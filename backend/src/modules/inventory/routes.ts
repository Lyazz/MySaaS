import { Router } from 'express'
import multer from 'multer'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { InventoryController } from './inventory.controller'
import { BulkInventoryController } from './bulk.controller'

const router = Router()
const controller = new InventoryController()
const bulkController = new BulkInventoryController()

const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const ok =
            file.mimetype === 'text/csv' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.originalname.toLowerCase().endsWith('.csv')
        if (!ok) return cb(new Error('Only CSV uploads are allowed'))
        cb(null, true)
    }
})

router.use(requireTenantAdmin)

router.get('/variants', controller.listVariants.bind(controller))
router.get('/variants/export.csv', bulkController.exportVariantsCsv.bind(bulkController))
router.post('/variants/import.csv', csvUpload.single('file'), bulkController.importVariantsCsv.bind(bulkController))
router.patch('/variants/bulk', bulkController.bulkPatchVariants.bind(bulkController))
router.get('/variants/:id/movements', controller.listMovements.bind(controller))
router.patch('/variants/:id', controller.updateVariantInventory.bind(controller))

export default router
