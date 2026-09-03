import { Router } from 'express'
import { OrdersController } from './orders.controller'

const router = Router()
const controller = new OrdersController()

// POST /orders - Create order (public, no auth required)
router.post('/loyalty/summary', controller.loyaltySummaryPublic.bind(controller))
router.post('/promo-code/preview', controller.promoCodePreviewPublic.bind(controller))
router.post('/', controller.createPublic.bind(controller))
router.get('/:id/pixel', controller.pixelPayloadPublic.bind(controller))
router.post('/confirm', controller.confirmTokenPublic.bind(controller))

export default router
