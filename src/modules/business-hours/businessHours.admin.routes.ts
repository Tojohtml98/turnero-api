import { Router } from 'express'
import { getBusinessHoursController, updateBusinessHoursController } from './businessHours.controller'
import { validateBody } from '../../middleware/validate'
import { updateBusinessHoursSchema } from './businessHours.schema'

const router = Router()

router.get('/', getBusinessHoursController)
router.put('/', validateBody(updateBusinessHoursSchema), updateBusinessHoursController)

export default router
