import { Router } from 'express'
import { getBusinessHoursController } from './businessHours.controller'

// Publico y de solo lectura: la pagina de reserva muestra el horario de atencion.
const router = Router()

router.get('/', getBusinessHoursController)

export default router
