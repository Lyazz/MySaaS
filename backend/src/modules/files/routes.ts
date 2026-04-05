import { Router } from 'express'
import { LocalFilesController } from './local-files.controller'

const router = Router()
const controller = new LocalFilesController()

router.get('/local', controller.download.bind(controller))

export default router

