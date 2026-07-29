import mongoose, { Schema, Types } from 'mongoose'

export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'no-show'

export interface IAppointment {
  service: Types.ObjectId
  serviceName: string
  durationMinutes: number
  price: number
  startAt: Date
  endAt: Date
  customerName: string
  customerPhone: string
  customerEmail: string
  status: AppointmentStatus
  notes: string
  createdAt: Date
  updatedAt: Date
}

const appointmentSchema = new Schema<IAppointment>(
  {
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    // Snapshot: si el servicio cambia de nombre/precio despues, el turno
    // ya reservado conserva los datos con los que el cliente reservo.
    serviceName: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    price: { type: Number, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true, lowercase: true, default: '' },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed', 'no-show'],
      default: 'confirmed',
    },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

appointmentSchema.index({ startAt: 1 })

export default mongoose.model<IAppointment>('Appointment', appointmentSchema)
