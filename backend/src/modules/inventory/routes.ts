import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { InventoryController } from './inventory.controller'

const router = Router()
const controller = new InventoryController()

router.use(requireTenantAdmin)

router.get('/variants', controller.listVariants.bind(controller))
router.get('/variants/:id/movements', controller.listMovements.bind(controller))
router.patch('/variants/:id', controller.updateVariantInventory.bind(controller))

export default router

