import { Router } from 'express'
import { requireTenantAdmin } from '../../middleware/rbac.middleware'
import { AuditLogsController } from './audit-logs.controller'

const router = Router()
const controller = new AuditLogsController()

router.use(requireTenantAdmin)

router.get('/', controller.list.bind(controller))

export default router

