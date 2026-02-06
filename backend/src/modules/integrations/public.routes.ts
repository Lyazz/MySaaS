import { Router } from 'express'
import { FacebookPixelController } from './facebook-pixel.controller'

const router = Router()
const controller = new FacebookPixelController()

router.get('/facebook.js', controller.script.bind(controller))
router.get('/facebook.json', controller.config.bind(controller))

export default router
