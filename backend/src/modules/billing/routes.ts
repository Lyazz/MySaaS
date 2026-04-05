import { Router } from 'express'
import multer from 'multer'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { BillingController } from './billing.controller'
import { BillingProofsController } from './billing-proofs.controller'
import { billingProofsUploadErrorMiddleware } from './billing-proofs.error-middleware'

const router = Router()
const controller = new BillingController()
const proofsController = new BillingProofsController()

router.use(requireTenantMember)
router.use(requireStaffCrud('billing'))

router.get('/plans', controller.listPlans.bind(controller))
router.get('/subscription', controller.getSubscription.bind(controller))
router.get('/payments', controller.listPayments.bind(controller))
router.post('/payments/submit', controller.submitPayment.bind(controller))
router.post('/payments/simulate', controller.simulatePayment.bind(controller))

const proofUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
        const ok =
            file.mimetype.startsWith('image/') ||
            file.mimetype === 'application/pdf' ||
            file.originalname.toLowerCase().endsWith('.pdf')
        if (!ok) return cb(new Error('Only proof uploads are allowed'))
        cb(null, true)
    }
})

router.post('/proofs/upload', proofUpload.single('file'), proofsController.upload.bind(proofsController))
router.get('/payments/:paymentId/proof-url', proofsController.getPaymentProofUrl.bind(proofsController))
router.use(billingProofsUploadErrorMiddleware)

export default router
