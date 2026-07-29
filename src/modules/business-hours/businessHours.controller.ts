import { Request, Response } from 'express'
import businessHoursService from './businessHours.service'

export const getBusinessHoursController = async (_req: Request, res: Response): Promise<void> => {
  const hours = await businessHoursService.get()
  res.json(hours)
}

export const updateBusinessHoursController = async (req: Request, res: Response): Promise<void> => {
  const hours = await businessHoursService.update(req.body)
  res.json(hours)
}
