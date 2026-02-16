import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { VariantsController } from './variants.controller'

const router = Router()
const controller = new VariantsController()

router.use(requireTenantMember)
router.use(requireStaffCrud('variants'))

router.put('/:id', controller.updateVariant.bind(controller))
router.get('/:id/sku/suggest', controller.suggestSku.bind(controller))
router.post('/:id/sku/lock', controller.lockSku.bind(controller))
router.post('/:id/images', controller.replaceVariantImages.bind(controller))
router.delete('/:id', controller.deleteVariant.bind(controller))

export default router
