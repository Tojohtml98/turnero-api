import serviceRepo from '../services/service.repository'
import { normalize } from '../../lib/naturalDate'
import { getIntentParser } from './parsers'
import { IntentContext, ParsedIntent } from './intent.types'

// Orquesta el parseo: arma el contexto con el catalogo real, delega en el
// motor configurado y resuelve el nombre suelto que dijo el cliente contra un
// servicio existente. No reserva nada.

export interface ServiceMatch {
  serviceId: string
  name: string
  durationMinutes: number
  price: number
}

export interface IntentResult {
  text: string
  parser: string
  intent: ParsedIntent
  /** El servicio del catalogo que corresponde al texto, si se pudo resolver. */
  match: ServiceMatch | null
  /** Que falta para poder reservar. El front sabe que repreguntar. */
  missing: ('service' | 'date' | 'time')[]
  ready: boolean
}

// El parser devuelve el servicio como texto libre. Recien aca se lo ata a un
// documento real: comparacion normalizada, exacta primero y por inclusion
// despues, para que "corte" encuentre "Corte de pelo".
const resolveService = async (spoken: string | null): Promise<ServiceMatch | null> => {
  if (!spoken) return null

  const services = await serviceRepo.findAllActive()
  if (services.length === 0) return null

  const needle = normalize(spoken)
  const exact = services.find((s) => normalize(s.name) === needle)
  const partial =
    exact ??
    services.find((s) => normalize(s.name).includes(needle) || needle.includes(normalize(s.name)))

  if (!partial) return null

  return {
    serviceId: String(partial._id),
    name: partial.name,
    durationMinutes: partial.durationMinutes,
    price: partial.price,
  }
}

const parse = async (text: string, options: { now?: Date } = {}): Promise<IntentResult> => {
  const services = await serviceRepo.findAllActive()
  const parser = getIntentParser()

  const context: IntentContext = {
    serviceNames: services.map((s) => s.name),
    now: options.now,
  }

  const intent = await parser.parseIntent(text, context)
  const match = await resolveService(intent.service)

  const missing: IntentResult['missing'] = []
  if (!match) missing.push('service')
  if (!intent.date) missing.push('date')
  if (!intent.time) missing.push('time')

  return {
    text,
    parser: parser.name,
    intent,
    match,
    missing,
    ready: missing.length === 0,
  }
}

export default { parse, resolveService }
