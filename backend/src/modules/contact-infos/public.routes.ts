import { Router } from 'express'
import { ContactInfosController } from './contact-infos.controller'

const router = Router()
const controller = new ContactInfosController()

router.get('/contact-infos', controller.listPublic.bind(controller))

export default router

