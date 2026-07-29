// Payload que viaja dentro del JWT y queda disponible en req.user
export interface AuthPayload {
  id: string
  role?: string
}
