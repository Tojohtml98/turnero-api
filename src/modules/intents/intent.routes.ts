import { Router } from 'express'
import { parseIntentController } from './intent.controller'
import { validateBody } from '../../middleware/validate'
import { parseIntentSchema } from './intent.schema'

// Publico: interpreta el pedido en lenguaje natural y devuelve el intent.
// NO reserva — para eso sigue estando POST /api/appointments, que valida
// horario comercial y solapamientos.
const router = Router()

router.post('/parse', validateBody(parseIntentSchema), parseIntentController)

export default router
