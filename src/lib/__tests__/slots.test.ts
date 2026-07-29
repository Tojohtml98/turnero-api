import { getAvailableSlots, combineDateAndTime, formatTime } from '../slots'

const day = new Date(2026, 0, 12) // lunes cualquiera, sin hora
const open9to18 = { open: '09:00', close: '18:00', closed: false }

describe('combineDateAndTime', () => {
  it('combines the date part with the given HH:mm', () => {
    const result = combineDateAndTime(day, '14:30')
    expect(result.getHours()).toBe(14)
    expect(result.getMinutes()).toBe(30)
    expect(result.getDate()).toBe(day.getDate())
  })
})

describe('formatTime', () => {
  it('pads hours and minutes to two digits', () => {
    const date = new Date(2026, 0, 1, 9, 5)
    expect(formatTime(date)).toBe('09:05')
  })
})

describe('getAvailableSlots', () => {
  it('returns empty when the day is closed', () => {
    const slots = getAvailableSlots({
      date: day,
      daySchedule: { open: '09:00', close: '18:00', closed: true },
      durationMinutes: 30,
      slotStepMinutes: 30,
      busy: [],
      now: new Date(2020, 0, 1),
    })
    expect(slots).toEqual([])
  })

  it('generates slots stepping every slotStepMinutes within business hours', () => {
    const slots = getAvailableSlots({
      date: day,
      daySchedule: { open: '09:00', close: '10:00', closed: false },
      durationMinutes: 30,
      slotStepMinutes: 30,
      busy: [],
      now: new Date(2020, 0, 1),
    })
    expect(slots.map(formatTime)).toEqual(['09:00', '09:30'])
  })

  it('does not offer a slot that would run past closing time', () => {
    const slots = getAvailableSlots({
      date: day,
      daySchedule: { open: '09:00', close: '10:00', closed: false },
      durationMinutes: 45,
      slotStepMinutes: 30,
      busy: [],
      now: new Date(2020, 0, 1),
    })
    // 09:30 + 45min = 10:15, se pasa del cierre -> solo 09:00 queda
    expect(slots.map(formatTime)).toEqual(['09:00'])
  })

  it('excludes slots that overlap an existing appointment', () => {
    const busyStart = combineDateAndTime(day, '09:30')
    const busyEnd = combineDateAndTime(day, '10:00')

    const slots = getAvailableSlots({
      date: day,
      daySchedule: open9to18,
      durationMinutes: 30,
      slotStepMinutes: 30,
      busy: [{ start: busyStart, end: busyEnd }],
      now: new Date(2020, 0, 1),
    })

    expect(slots.map(formatTime)).not.toContain('09:30')
    expect(slots.map(formatTime)).toContain('09:00')
    expect(slots.map(formatTime)).toContain('10:00')
  })

  it('excludes slots that already started relative to now', () => {
    const now = combineDateAndTime(day, '09:45')

    const slots = getAvailableSlots({
      date: day,
      daySchedule: { open: '09:00', close: '11:00', closed: false },
      durationMinutes: 30,
      slotStepMinutes: 30,
      busy: [],
      now,
    })

    expect(slots.map(formatTime)).toEqual(['10:00', '10:30'])
  })

  it('returns empty when open is not before close', () => {
    const slots = getAvailableSlots({
      date: day,
      daySchedule: { open: '18:00', close: '09:00', closed: false },
      durationMinutes: 30,
      slotStepMinutes: 30,
      busy: [],
    })
    expect(slots).toEqual([])
  })
})
