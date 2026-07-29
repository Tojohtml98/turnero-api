import serviceRepo, { ServiceInput } from './service.repository'
import { AppError } from '../../middleware/errorHandler'

const listPublic = () => serviceRepo.findAllActive()

const listAll = () => serviceRepo.findAll()

const getById = async (id: string) => {
  const service = await serviceRepo.findById(id)
  if (!service) throw new AppError('Service not found', 404)
  return service
}

const create = (data: ServiceInput) => serviceRepo.create(data)

const update = async (id: string, data: ServiceInput) => {
  const service = await serviceRepo.update(id, data)
  if (!service) throw new AppError('Service not found', 404)
  return service
}

const remove = async (id: string) => {
  const service = await serviceRepo.remove(id)
  if (!service) throw new AppError('Service not found', 404)
}

export default { listPublic, listAll, getById, create, update, remove }
