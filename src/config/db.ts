import mongoose from 'mongoose'
import env from './env'

const connectDB = async (): Promise<void> => {
  const conn = await mongoose.connect(env.mongoUri)
  console.log(`MongoDB connected: ${conn.connection.host}`)
}

export default connectDB
