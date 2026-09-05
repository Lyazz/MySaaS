import { Router } from 'express'
import multer from 'multer'
import type { ErrorRequestHandler } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { ProductsController } from './products.controller'
import { BundleDealsController } from './bundle-deals.controller'
import imagesRoutes from './images.routes'
import { BulkProductsController } from './bulk.controller'

const router = Router()
const controller = new ProductsController()
const bundleDealsController = new BundleDealsController()
const bulkController = new BulkProductsController()

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

const zipUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const ok =
            file.mimetype === 'application/zip' ||
            file.mimetype === 'application/x-zip-compressed' ||
            file.mimetype === 'application/octet-stream' ||
            file.originalname.toLowerCase().endsWith('.zip')
        if (!ok) return cb(new Error('Only ZIP uploads are allowed'))
        cb(null, true)
    }
})

const bulkUploadErrorMiddleware: ErrorRequestHandler = (err, _req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ statusCode: 400, statusMessage: 'File is too large' })
        }
        return res.status(400).json({ statusCode: 400, statusMessage: err.message })
    }
    if (err instanceof Error && /uploads are allowed/i.test(err.message)) {
        return res.status(400).json({ statusCode: 400, statusMessage: err.message })
    }
    return next(err)
}

// Auth + tenant context for this router (staff permissions enforced via middleware)
router.use(requireTenantMember)
router.use(requireStaffCrud('products'))

// Bulk ops (must be defined before "/:id" routes)
router.get('/export.csv', bulkController.exportCsv.bind(bulkController))
router.post('/import.csv', csvUpload.single('file'), bulkUploadErrorMiddleware, bulkController.importCsv.bind(bulkController))
router.get('/export.zip', bulkController.exportZip.bind(bulkController))
router.post('/import.zip', zipUpload.single('file'), bulkUploadErrorMiddleware, bulkController.importZip.bind(bulkController))
// Progress-reporting (NDJSON) variants, used by the admin UI for large catalogs.
router.get('/export.zip/stream', bulkController.exportZipStream.bind(bulkController))
router.post(
    '/import.csv/stream',
    csvUpload.single('file'),
    bulkUploadErrorMiddleware,
    bulkController.importCsvStream.bind(bulkController)
)
router.post(
    '/import.zip/stream',
    zipUpload.single('file'),
    bulkUploadErrorMiddleware,
    bulkController.importZipStream.bind(bulkController)
)
router.patch('/bulk', bulkController.bulkPatch.bind(bulkController))
router.delete('/bulk', bulkController.bulkDelete.bind(bulkController))
router.post('/:id/duplicate', bulkController.duplicate.bind(bulkController))
router.get('/slug-availability', controller.checkSlugAvailability.bind(controller))

// GET /products - List products
router.get('/', controller.listProducts.bind(controller))

// POST /products - Create product
router.post('/', controller.createProduct.bind(controller))

// GET /products/:id - Get product
router.get('/:id', controller.getProduct.bind(controller))

// Bundle deals (fixed bundle pricing)
// GET /products/:productId/bundles - List bundle deals
router.get('/:productId/bundles', bundleDealsController.list.bind(bundleDealsController))

// POST /products/:productId/bundles - Create bundle deal
router.post('/:productId/bundles', bundleDealsController.create.bind(bundleDealsController))

// PATCH /products/:productId/bundles/:dealId - Update bundle deal
router.patch('/:productId/bundles/:dealId', bundleDealsController.update.bind(bundleDealsController))

// DELETE /products/:productId/bundles/:dealId - Delete bundle deal
router.delete('/:productId/bundles/:dealId', bundleDealsController.delete.bind(bundleDealsController))

// PUT /products/:id - Update product
router.put('/:id', controller.updateProduct.bind(controller))

// DELETE /products/:id - Delete product
router.delete('/:id', controller.deleteProduct.bind(controller))

// POST /products/:productId/variants/generate - Generate variants from options
router.post('/:productId/variants/generate', controller.generateVariants.bind(controller))
router.post('/:productId/variants/allocate-stock', controller.allocateVariantStock.bind(controller))

// POST /products/:productId/options - Create option
router.post('/:productId/options', controller.createOption.bind(controller))

// DELETE /products/:productId/options/:optionId - Delete option
router.delete('/:productId/options/:optionId', controller.deleteOption.bind(controller))

// PUT /products/:productId/options/:optionId - Update option
router.put('/:productId/options/:optionId', controller.updateOption.bind(controller))

// POST /products/:productId/options/:optionId/values - Add option value
router.post('/:productId/options/:optionId/values', controller.addOptionValue.bind(controller))

// DELETE /products/:productId/options/:optionId/values/:valueId - Delete option value
router.delete('/:productId/options/:optionId/values/:valueId', controller.deleteOptionValue.bind(controller))

// PUT /products/:productId/options/:optionId/values/:valueId - Update option value
router.put('/:productId/options/:optionId/values/:valueId', controller.updateOptionValue.bind(controller))

// Mount image routes
router.use('/', imagesRoutes)

export default router
