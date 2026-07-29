import { Router } from 'express'
import { listPublicServicesController } from './service.controller'

// Publico: solo servicios activos, para la pagina de reserva.
const router = Router()

router.get('/', listPublicServicesController)

export default router
