import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { VariantsController } from './variants.controller'

const router = Router()
const controller = new VariantsController()

router.use(requireTenantAdmin)

router.put('/:id', controller.updateVariant.bind(controller))
router.post('/:id/images', controller.replaceVariantImages.bind(controller))
router.delete('/:id', controller.deleteVariant.bind(controller))

export default router
