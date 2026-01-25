import { Router } from 'express'
import { StoreSettingsController } from './store-settings.controller'

const router = Router()
const controller = new StoreSettingsController()

router.get('/settings', controller.getPublic.bind(controller))

export default router

