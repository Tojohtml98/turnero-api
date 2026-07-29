import { Router } from 'express'
import { getAvailabilityController, createAppointmentController } from './appointment.controller'
import { validateBody, validateQuery } from '../../middleware/validate'
import { availabilityQuerySchema, createAppointmentSchema } from './appointment.schema'

// Publico: consultar horarios libres y reservar. Sin autenticacion.
const router = Router()

router.get('/availability', validateQuery(availabilityQuerySchema), getAvailabilityController)
router.post('/', validateBody(createAppointmentSchema), createAppointmentController)

export default router
