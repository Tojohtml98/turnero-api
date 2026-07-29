import { Request, Response, NextFunction } from 'express'
import { ZodType } from 'zod'
import { AppError } from './errorHandler'

// Valida req.body contra un schema de zod antes de llegar al controller.
// Si falla, corta con 400 y el detalle por campo.
export const validateBody =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join(', ')

      throw new AppError(`Validation failed - ${details}`, 400)
    }

    req.body = result.data
    next()
  }

// Valida req.query (para GET con filtros/parametros de disponibilidad).
export const validateQuery =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)

    if (!result.success) {
      const details = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'query'}: ${issue.message}`)
        .join(', ')

      throw new AppError(`Validation failed - ${details}`, 400)
    }

    req.query = result.data as typeof req.query
    next()
  }
