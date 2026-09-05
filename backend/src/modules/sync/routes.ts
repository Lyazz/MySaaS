import { Router } from 'express'
import { requireTenantMember } from '../../middleware/rbac.middleware'
import { SyncController } from './sync.controller'

const router = Router()
const controller = new SyncController()

router.use(requireTenantMember)
router.get('/pull', controller.pull.bind(controller))

export default router
