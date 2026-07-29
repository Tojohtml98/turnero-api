import { Router } from 'express'
import { loginController, refreshController, logoutController } from './auth.controller'
import { authenticate } from '../../middleware/authenticate'
import { validateBody } from '../../middleware/validate'
import { loginSchema, refreshSchema } from './auth.schema'

const router = Router()

router.post('/login', validateBody(loginSchema), loginController)
router.post('/refresh', validateBody(refreshSchema), refreshController)
router.post('/logout', authenticate, logoutController)

export default router
