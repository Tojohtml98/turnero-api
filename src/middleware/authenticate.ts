import { Request, Response, NextFunction, RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from './errorHandler'
import env from '../config/env'
import { AuthPayload } from '../types'

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new AppError('No token provided', 401)

  const token = header.split(' ')[1]
  const payload = jwt.verify(token, env.jwtSecret) as AuthPayload
  req.user = payload // { id, role } disponible en todos los controllers
  next()
}

export const authorize =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user.role || !roles.includes(req.user.role)) throw new AppError('Forbidden', 403)
    next()
  }
