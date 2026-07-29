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
  intentParser: string
  intentTimeoutMs: number
  ollamaUrl: string
  ollamaModel: string
  nimApiKey: string
  nimBaseUrl: string
  nimModel: string
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
  // Motor de lenguaje natural: rules | ollama | nim | auto. El default es el
  // deterministico, que no necesita red ni configuracion.
  intentParser: process.env.INTENT_PARSER ?? 'rules',
  intentTimeoutMs: Number(process.env.INTENT_TIMEOUT_MS) || 8000,
  ollamaUrl: process.env.OLLAMA_URL ?? '',
  ollamaModel: process.env.OLLAMA_MODEL ?? 'llama3.2',
  nimApiKey: process.env.NVIDIA_NIM_API_KEY ?? '',
  nimBaseUrl: process.env.NVIDIA_NIM_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
  nimModel: process.env.NVIDIA_NIM_MODEL ?? 'meta/llama-3.1-8b-instruct',
}

export default env
