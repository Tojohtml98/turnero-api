import { Request, Response } from 'express'
import appointmentService from './appointment.service'

export const getAvailabilityController = async (req: Request, res: Response): Promise<void> => {
  const { serviceId, date } = req.query as { serviceId: string; date: string }
  const slots = await appointmentService.getAvailability(serviceId, date)
  res.json({ date, slots })
}

export const createAppointmentController = async (req: Request, res: Response): Promise<void> => {
  const appointment = await appointmentService.book(req.body)
  res.status(201).json(appointment)
}

export const listAppointmentsController = async (req: Request, res: Response): Promise<void> => {
  const { from, to, status } = req.query as { from?: string; to?: string; status?: never }
  const appointments = await appointmentService.listAdmin({ from, to, status })
  res.json(appointments)
}

export const updateAppointmentController = async (req: Request, res: Response): Promise<void> => {
  const appointment = await appointmentService.update(req.params.id, req.body)
  res.json(appointment)
}
