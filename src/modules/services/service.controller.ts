import { Request, Response } from 'express'
import serviceService from './service.service'

export const listPublicServicesController = async (_req: Request, res: Response): Promise<void> => {
  const services = await serviceService.listPublic()
  res.json(services)
}

export const listAllServicesController = async (_req: Request, res: Response): Promise<void> => {
  const services = await serviceService.listAll()
  res.json(services)
}

export const createServiceController = async (req: Request, res: Response): Promise<void> => {
  const service = await serviceService.create(req.body)
  res.status(201).json(service)
}

export const updateServiceController = async (req: Request, res: Response): Promise<void> => {
  const service = await serviceService.update(req.params.id, req.body)
  res.json(service)
}

export const deleteServiceController = async (req: Request, res: Response): Promise<void> => {
  await serviceService.remove(req.params.id)
  res.status(204).send()
}
