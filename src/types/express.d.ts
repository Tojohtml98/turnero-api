import { AuthPayload } from './index'

// Extiende el Request de Express para que req.user este tipado
// en todos los controllers que corren detras del middleware authenticate.
declare global {
  namespace Express {
    interface Request {
      user: AuthPayload
    }
  }
}

export {}
