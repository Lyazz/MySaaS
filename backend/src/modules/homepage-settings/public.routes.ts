import { Router } from 'express'
import { HomepageSettingsController } from './homepage-settings.controller'

const router = Router()
const controller = new HomepageSettingsController()

router.get('/homepage', controller.getPublic.bind(controller))

export default router

