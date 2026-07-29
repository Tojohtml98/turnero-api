import nodemailer, { Transporter } from 'nodemailer'
import env from '../config/env'

// Sin SMTP configurado, el sistema sigue funcionando: solo se loguea que
// el email no se mando. Una reserva NUNCA debe fallar por un problema de mail.
const isConfigured = (): boolean => Boolean(env.smtpHost && env.smtpUser && env.smtpPass)

let transporter: Transporter | null = null
const getTransporter = (): Transporter | null => {
  if (!isConfigured()) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    })
  }
  return transporter
}

export const sendMail = async (to: string, subject: string, html: string): Promise<void> => {
  if (!to) return
  const t = getTransporter()
  if (!t) {
    console.log(`[mailer] SMTP no configurado - omitiendo email a ${to}: "${subject}"`)
    return
  }
  try {
    await t.sendMail({ from: env.smtpFrom, to, subject, html })
  } catch (err) {
    console.error(`[mailer] fallo al enviar email a ${to}:`, (err as Error).message)
  }
}

interface AppointmentEmailData {
  customerEmail: string
  customerName: string
  serviceName: string
  startAt: Date
}

const formatDateTime = (date: Date): string =>
  date.toLocaleString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

export const sendConfirmationEmail = async (data: AppointmentEmailData): Promise<void> => {
  const when = formatDateTime(data.startAt)
  await sendMail(
    data.customerEmail,
    `Turno confirmado - ${env.businessName}`,
    `<p>Hola ${data.customerName},</p>
     <p>Tu turno para <strong>${data.serviceName}</strong> quedo confirmado para <strong>${when}</strong>.</p>
     <p>${env.businessName}</p>`
  )
}

export const sendReminderEmail = async (data: AppointmentEmailData): Promise<void> => {
  const when = formatDateTime(data.startAt)
  await sendMail(
    data.customerEmail,
    `Recordatorio de turno - ${env.businessName}`,
    `<p>Hola ${data.customerName},</p>
     <p>Te recordamos tu turno para <strong>${data.serviceName}</strong> el <strong>${when}</strong>.</p>
     <p>Si no podes asistir, por favor avisanos para liberar el horario.</p>
     <p>${env.businessName}</p>`
  )
}
