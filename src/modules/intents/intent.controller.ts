import { Request, Response } from 'express'
import intentService from './intent.service'

export const parseIntentController = async (req: Request, res: Response): Promise<void> => {
  const result = await intentService.parse(req.body.text)
  res.json(result)
}
