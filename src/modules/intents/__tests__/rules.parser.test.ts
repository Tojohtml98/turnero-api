import { RulesIntentParser } from '../parsers/rules.parser'
import { sanitizeIntent } from '../intent.types'

const parser = new RulesIntentParser()
const now = new Date(2026, 6, 15, 10, 0) // miercoles 15/07/2026
const catalog = ['Corte de pelo', 'Barba', 'Color']

const parse = (text: string) => parser.parseIntent(text, { serviceNames: catalog, now })

describe('RulesIntentParser', () => {
  it('parses the canonical request', async () => {
    const intent = await parse('quiero turno de corte manana a las 3')

    expect(intent).toEqual({
      service: 'Corte de pelo',
      date: '2026-07-16',
      time: '15:00',
    })
  })

  it('is deterministic: same text, same output', async () => {
    const first = await parse('turno de barba el viernes 10:30')
    const second = await parse('turno de barba el viernes 10:30')

    expect(first).toEqual(second)
  })

  it('matches a catalog service by full name', async () => {
    const intent = await parse('necesito un corte de pelo hoy')
    expect(intent.service).toBe('Corte de pelo')
  })

  it('matches a catalog service by a single word', async () => {
    const intent = await parse('me gustaria reservar barba para el sabado')
    expect(intent.service).toBe('Barba')
  })

  it('is accent-insensitive on the catalog', async () => {
    const intent = await parser.parseIntent('quiero un cólor', {
      serviceNames: catalog,
      now,
    })
    expect(intent.service).toBe('Color')
  })

  it('falls back to the phrasing when nothing matches the catalog', async () => {
    const intent = await parse('quiero turno de masajes manana')
    expect(intent.service).toBe('masajes')
  })

  it('works without a catalog at all', async () => {
    const intent = await parser.parseIntent('quiero turno de corte manana a las 3', { now })

    expect(intent.service).toBe('corte')
    expect(intent.date).toBe('2026-07-16')
    expect(intent.time).toBe('15:00')
  })

  it('returns nulls for date and time when the text has neither', async () => {
    const intent = await parse('hola queria sacar un turno de barba')

    expect(intent.service).toBe('Barba')
    expect(intent.date).toBeNull()
    expect(intent.time).toBeNull()
  })

  it('does not invent a service out of filler words', async () => {
    const intent = await parse('hola buenas, hay lugar manana?')

    expect(intent.service).toBeNull()
    expect(intent.date).toBe('2026-07-16')
  })

  it('never calls the network', async () => {
    const spy = jest.spyOn(global, 'fetch')
    await parse('turno de corte manana a las 3')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('sanitizeIntent', () => {
  it('keeps well-formed values', () => {
    expect(sanitizeIntent({ service: 'Corte', date: '2026-08-05', time: '15:30' })).toEqual({
      service: 'Corte',
      date: '2026-08-05',
      time: '15:30',
    })
  })

  it('nulls a date that is not ISO', () => {
    expect(sanitizeIntent({ date: 'manana' }).date).toBeNull()
  })

  it('nulls a date that is well-formed but impossible', () => {
    expect(sanitizeIntent({ date: '2026-02-30' }).date).toBeNull()
  })

  it('nulls a time that is not HH:mm', () => {
    expect(sanitizeIntent({ time: '3pm' }).time).toBeNull()
    expect(sanitizeIntent({ time: '25:00' }).time).toBeNull()
  })

  it('trims the service and nulls it when empty', () => {
    expect(sanitizeIntent({ service: '  Corte  ' }).service).toBe('Corte')
    expect(sanitizeIntent({ service: '   ' }).service).toBeNull()
  })

  it('ignores non-string input', () => {
    expect(sanitizeIntent({ service: 42 as never, date: {} as never })).toEqual({
      service: null,
      date: null,
      time: null,
    })
  })
})
