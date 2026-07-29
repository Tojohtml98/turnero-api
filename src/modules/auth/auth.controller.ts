import { Request, Response } from 'express'
import authService from './auth.service'

export const loginController = async (req: Request, res: Response): Promise<void> => {
  const { user, accessToken, refreshToken } = await authService.login(req.body)
  res.json({ user, accessToken, refreshToken })
}

export const refreshController = async (req: Request, res: Response): Promise<void> => {
  const tokens = await authService.refresh(req.body.refreshToken)
  res.json(tokens)
}

export const logoutController = async (req: Request, res: Response): Promise<void> => {
  await authService.logout(req.user.id)
  res.json({ message: 'Logged out' })
}
