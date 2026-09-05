import { Router } from 'express'

import { AuthController } from './auth.controller'
import { VerificationController } from './verification.controller'

const router = Router()
const controller = new AuthController()
const verification = new VerificationController()

router.post('/register', controller.register.bind(controller))
router.post('/login', controller.login.bind(controller))
router.post('/logout', controller.logout.bind(controller))
router.get('/me', controller.me.bind(controller))

// Signup verification and password reset. Unauthenticated by nature — the code
// is the credential — and rate limited in `app.ts` under /api/auth.
router.get('/auth/otp/channels', verification.channels.bind(verification))
router.post('/auth/otp/send', verification.sendCode.bind(verification))
router.post('/auth/otp/verify', verification.verifyCode.bind(verification))
router.post('/auth/password/forgot', verification.forgotPassword.bind(verification))
router.post('/auth/password/reset', verification.resetPassword.bind(verification))

export default router
