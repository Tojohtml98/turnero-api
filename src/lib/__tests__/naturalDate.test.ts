import { parseNaturalDate, parseNaturalTime, normalize } from '../naturalDate'

// Miercoles 15 de julio de 2026, para que los relativos sean predecibles.
const now = new Date(2026, 6, 15, 10, 0)

describe('normalize', () => {
  it('lowercases and strips accents', () => {
    expect(normalize('  Miércoles  a las TRES ')).toBe('miercoles a las tres')
  })
})

describe('parseNaturalDate', () => {
  it('returns null when there is no date in the text', () => {
    expect(parseNaturalDate('quiero un turno de corte', now)).toBeNull()
  })

  it('resolves hoy', () => {
    expect(parseNaturalDate('quiero turno hoy', now)).toBe('2026-07-15')
  })

  it('resolves manana', () => {
    expect(parseNaturalDate('quiero turno de corte manana a las 3', now)).toBe('2026-07-16')
  })

  it('resolves manana written with the enye', () => {
    expect(parseNaturalDate('turno mañana', now)).toBe('2026-07-16')
  })

  it('resolves pasado manana without being shadowed by manana', () => {
    expect(parseNaturalDate('pasado manana si puede ser', now)).toBe('2026-07-17')
  })

  it('keeps the date when the text also names a time band', () => {
    // El bug que motivo stripTimeBands: la franja no debe tapar el dia.
    expect(parseNaturalDate('manana a las 10 de la manana', now)).toBe('2026-07-16')
  })

  it('reads a time band alone as no date at all', () => {
    expect(parseNaturalDate('a la manana temprano', now)).toBeNull()
  })

  it('resolves the next occurrence of a weekday', () => {
    // Miercoles -> el viernes que viene es el 17.
    expect(parseNaturalDate('el viernes', now)).toBe('2026-07-17')
  })

  it('never resolves a weekday to today', () => {
    // Dicho un miercoles, "el miercoles" es el de la semana que viene.
    expect(parseNaturalDate('el miercoles', now)).toBe('2026-07-22')
  })

  it('resolves a weekday that already passed this week to the next one', () => {
    expect(parseNaturalDate('el lunes', now)).toBe('2026-07-20')
  })

  it('accepts an accented weekday', () => {
    expect(parseNaturalDate('el sábado', now)).toBe('2026-07-18')
  })

  it('resolves a written day and month', () => {
    expect(parseNaturalDate('el 5 de agosto', now)).toBe('2026-08-05')
  })

  it('accepts an abbreviated month', () => {
    expect(parseNaturalDate('el 5 de ago', now)).toBe('2026-08-05')
  })

  it('rolls a past day/month into next year', () => {
    // Dicho en julio, "5 de enero" es el enero que viene.
    expect(parseNaturalDate('el 5 de enero', now)).toBe('2027-01-05')
  })

  it('resolves a numeric day/month', () => {
    expect(parseNaturalDate('el 20/7 dale', now)).toBe('2026-07-20')
  })

  it('resolves a numeric date with an explicit year', () => {
    expect(parseNaturalDate('05/08/2026', now)).toBe('2026-08-05')
  })

  it('resolves a two-digit year', () => {
    expect(parseNaturalDate('05/08/27', now)).toBe('2027-08-05')
  })

  it('resolves an ISO date as-is', () => {
    expect(parseNaturalDate('quiero el 2026-08-05', now)).toBe('2026-08-05')
  })

  it('returns null for an impossible date', () => {
    expect(parseNaturalDate('el 31 de febrero', now)).toBeNull()
    expect(parseNaturalDate('2026-02-30', now)).toBeNull()
  })

  it('does not read a time as a date', () => {
    expect(parseNaturalDate('a las 3 de la tarde', now)).toBeNull()
  })
})

describe('parseNaturalTime', () => {
  it('returns null when there is no time in the text', () => {
    expect(parseNaturalTime('quiero un turno de corte manana')).toBeNull()
  })

  it('reads HH:mm as-is', () => {
    expect(parseNaturalTime('a las 15:30')).toBe('15:30')
  })

  it('reads a dot as a separator', () => {
    expect(parseNaturalTime('15.30')).toBe('15:30')
  })

  it('assumes afternoon for a bare 1-8', () => {
    // Un negocio que abre 09-18 no da turnos a las 3 de la madrugada.
    expect(parseNaturalTime('a las 3')).toBe('15:00')
    expect(parseNaturalTime('a las 8')).toBe('20:00')
  })

  it('keeps a bare 9-12 in the morning', () => {
    expect(parseNaturalTime('a las 9')).toBe('09:00')
    expect(parseNaturalTime('a las 11')).toBe('11:00')
  })

  it('respects an explicit morning band', () => {
    expect(parseNaturalTime('a las 3 de la manana')).toBe('03:00')
  })

  it('respects an explicit afternoon band', () => {
    expect(parseNaturalTime('a las 4 de la tarde')).toBe('16:00')
  })

  it('respects an explicit night band', () => {
    expect(parseNaturalTime('a las 8 de la noche')).toBe('20:00')
  })

  it('does not shift a 24h hour that already passed noon', () => {
    expect(parseNaturalTime('a las 17')).toBe('17:00')
    expect(parseNaturalTime('17:45')).toBe('17:45')
  })

  it('reads hs suffixes', () => {
    expect(parseNaturalTime('16hs')).toBe('16:00')
    expect(parseNaturalTime('16 horas')).toBe('16:00')
  })

  it('reads mediodia', () => {
    expect(parseNaturalTime('al mediodia')).toBe('12:00')
  })

  it('reads y media', () => {
    expect(parseNaturalTime('a las 3 y media')).toBe('15:30')
  })

  it('reads y cuarto', () => {
    expect(parseNaturalTime('a las 10 y cuarto')).toBe('10:15')
  })

  it('reads menos cuarto', () => {
    expect(parseNaturalTime('a las 4 menos cuarto de la tarde')).toBe('15:45')
  })

  it('returns null for an impossible time', () => {
    expect(parseNaturalTime('a las 99:00')).toBeNull()
    expect(parseNaturalTime('25:00')).toBeNull()
  })

  it('handles noon with an explicit morning band as midnight-ish', () => {
    expect(parseNaturalTime('a las 12 de la manana')).toBe('00:00')
  })
})
