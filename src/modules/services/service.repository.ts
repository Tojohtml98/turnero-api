import Service from './service.model'

export interface ServiceInput {
  name?: string
  description?: string
  durationMinutes?: number
  price?: number
  active?: boolean
}

const create = (data: ServiceInput) => Service.create(data)
const findById = (id: string) => Service.findById(id)
const findAllActive = () => Service.find({ active: true }).sort({ name: 1 })
const findAll = () => Service.find().sort({ name: 1 })
const update = (id: string, data: ServiceInput) =>
  Service.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true })
const remove = (id: string) => Service.findByIdAndDelete(id)

export default { create, findById, findAllActive, findAll, update, remove }
