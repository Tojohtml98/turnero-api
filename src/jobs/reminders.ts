import cron from 'node-cron'
import Appointment from '../modules/appointments/appointment.model'
import { sendReminderEmail } from '../lib/mailer'
import env from '../config/env'

// Corre una vez al dia: le manda un recordatorio a todos los turnos
// confirmados de MANANA con email cargado. Este es el feature que
// justifica el precio frente a "agendar por WhatsApp": reduce ausentismo
// sin que el dueno tenga que acordarse de avisarle a nadie.
export const runReminders = async (): Promise<number> => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const start = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)

  const appointments = await Appointment.find({
    status: 'confirmed',
    startAt: { $gte: start, $lt: end },
    customerEmail: { $ne: '' },
  })

  for (const appointment of appointments) {
    await sendReminderEmail({
      customerEmail: appointment.customerEmail,
      customerName: appointment.customerName,
      serviceName: appointment.serviceName,
      startAt: appointment.startAt,
    })
  }

  return appointments.length
}

export const scheduleReminders = (): void => {
  const hour = Math.min(Math.max(env.reminderCronHour, 0), 23)
  cron.schedule(`0 ${hour} * * *`, () => {
    runReminders()
      .then((count) => console.log(`[reminders] enviados ${count} recordatorios`))
      .catch((err) => console.error('[reminders] fallo el job:', (err as Error).message))
  })
}
