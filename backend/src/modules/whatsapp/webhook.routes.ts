import { Router } from 'express'
import { WhatsAppWebhookController } from './whatsapp.controller'

const router = Router()
const controller = new WhatsAppWebhookController()

// Public by necessity — Meta calls it. Authentication is the app-secret
// signature on POST and the verify token on GET, both checked in the controller.
router.get('/', controller.verify.bind(controller))
router.post('/', controller.receive.bind(controller))

export default router
