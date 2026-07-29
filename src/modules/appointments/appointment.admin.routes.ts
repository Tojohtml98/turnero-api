import { Router } from 'express'
import { listAppointmentsController, updateAppointmentController } from './appointment.controller'
import { validateBody, validateQuery } from '../../middleware/validate'
import { listAppointmentsQuerySchema, updateAppointmentSchema } from './appointment.schema'

// Admin: agenda completa, confirmar/cancelar/completar, reprogramar.
const router = Router()

router.get('/', validateQuery(listAppointmentsQuerySchema), listAppointmentsController)
router.patch('/:id', validateBody(updateAppointmentSchema), updateAppointmentController)

export default router
