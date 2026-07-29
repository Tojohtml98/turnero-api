// Crea el unico usuario admin + horario por defecto + servicios de ejemplo.
// No hay endpoint de registro publico a proposito (ver auth.service.ts),
// asi que este script es la UNICA forma de dar de alta el admin.
// Uso: npm run seed
import mongoose from 'mongoose'
import env from '../config/env'
import connectDB from '../config/db'
import User from '../modules/auth/user.model'
import Service from '../modules/services/service.model'
import businessHoursRepo from '../modules/business-hours/businessHours.repository'

const run = async (): Promise<void> => {
  if (!env.adminEmail || !env.adminPassword) {
    console.error('Falta ADMIN_EMAIL / ADMIN_PASSWORD en el .env - no se puede crear el admin.')
    process.exit(1)
  }

  await connectDB()

  const existingAdmin = await User.findOne({ email: env.adminEmail })
  if (existingAdmin) {
    console.log(`Admin ya existe: ${env.adminEmail} (no se modifica la password).`)
  } else {
    await User.create({ name: env.adminName, email: env.adminEmail, password: env.adminPassword })
    console.log(`Admin creado: ${env.adminEmail}`)
  }

  await businessHoursRepo.getOrCreate()
  console.log('Horario comercial listo (por defecto: Lun-Vie 9-18, Sab 9-13, Dom cerrado).')

  const serviceCount = await Service.countDocuments()
  if (serviceCount === 0) {
    await Service.create([
      { name: 'Servicio 1', description: 'Editalo desde el panel de admin', durationMinutes: 30, price: 0 },
      { name: 'Servicio 2', description: 'Editalo desde el panel de admin', durationMinutes: 60, price: 0 },
    ])
    console.log('2 servicios de ejemplo creados - edita nombre/duracion/precio real desde el panel.')
  } else {
    console.log(`Ya hay ${serviceCount} servicio(s) cargado(s), no se agregan ejemplos.`)
  }

  await mongoose.disconnect()
  console.log('Listo.')
}

run().catch((err) => {
  console.error('Fallo el seed:', err)
  process.exit(1)
})
