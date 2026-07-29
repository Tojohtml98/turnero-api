import { Router } from 'express'
import {
  listAllServicesController,
  createServiceController,
  updateServiceController,
  deleteServiceController,
} from './service.controller'
import { validateBody } from '../../middleware/validate'
import { createServiceSchema, updateServiceSchema } from './service.schema'

// Admin: CRUD completo (incluye servicios inactivos).
const router = Router()

router.get('/', listAllServicesController)
router.post('/', validateBody(createServiceSchema), createServiceController)
router.patch('/:id', validateBody(updateServiceSchema), updateServiceController)
router.delete('/:id', deleteServiceController)

export default router
