import mongoose, { Schema } from 'mongoose'

export interface IDaySchedule {
  open: string // "HH:mm"
  close: string // "HH:mm"
  closed: boolean
}

export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export type Weekday = (typeof WEEKDAYS)[number]

export type WeekSchedule = Record<Weekday, IDaySchedule>

export interface IBusinessHours {
  hours: WeekSchedule
  slotStepMinutes: number
  createdAt: Date
  updatedAt: Date
}

const daySchema = new Schema<IDaySchedule>(
  {
    open: { type: String, required: true },
    close: { type: String, required: true },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
)

const businessHoursSchema = new Schema<IBusinessHours>(
  {
    hours: {
      sun: { type: daySchema, required: true },
      mon: { type: daySchema, required: true },
      tue: { type: daySchema, required: true },
      wed: { type: daySchema, required: true },
      thu: { type: daySchema, required: true },
      fri: { type: daySchema, required: true },
      sat: { type: daySchema, required: true },
    },
    slotStepMinutes: { type: Number, default: 30, min: 5, max: 120 },
  },
  { timestamps: true }
)

export default mongoose.model<IBusinessHours>('BusinessHours', businessHoursSchema)
