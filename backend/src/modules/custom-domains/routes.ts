import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { requireStaffCrud } from '../../middleware/staff-permissions.middleware'
import { CustomDomainsController } from './custom-domains.controller'

const router = Router()
const controller = new CustomDomainsController()

router.use(requireTenantMember)
router.use(requireStaffCrud('storeSettings'))

router.get('/', controller.list.bind(controller))
router.post('/', controller.create.bind(controller))
router.delete('/:id', controller.delete.bind(controller))

export default router
