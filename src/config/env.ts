import 'dotenv/config'

export interface Env {
  port: number
  mongoUri: string
  jwtSecret: string
  jwtRefreshSecret: string
  jwtExpiresIn: string
  jwtRefreshExpiresIn: string
  nodeEnv: string
  businessName: string
  adminName: string
  adminEmail: string
  adminPassword: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpFrom: string
  reminderCronHour: number
}

const env: Env = {
  port: Number(process.env.PORT) || 3001,
  mongoUri: process.env.MONGODB_URI ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  businessName: process.env.BUSINESS_NAME ?? 'Mi Negocio',
  adminName: process.env.ADMIN_NAME ?? 'Admin',
  adminEmail: process.env.ADMIN_EMAIL ?? '',
  adminPassword: process.env.ADMIN_PASSWORD ?? '',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpFrom: process.env.SMTP_FROM || 'Turnero <no-reply@turnero.local>',
  reminderCronHour: Number(process.env.REMINDER_CRON_HOUR) || 18,
}

export default env
