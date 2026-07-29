import mongoose, { Schema } from 'mongoose'

export interface IService {
  name: string
  description: string
  durationMinutes: number
  price: number
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const serviceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    durationMinutes: { type: Number, required: true, min: 5, max: 480 },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export default mongoose.model<IService>('Service', serviceSchema)
