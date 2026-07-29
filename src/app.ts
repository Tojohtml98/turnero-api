import 'express-async-errors'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler'
import { authenticate, authorize } from './middleware/authenticate'
import env from './config/env'

import authRoutes from './modules/auth/auth.routes'
import serviceRoutes from './modules/services/service.routes'
import serviceAdminRoutes from './modules/services/service.admin.routes'
import businessHoursRoutes from './modules/business-hours/businessHours.routes'
import businessHoursAdminRoutes from './modules/business-hours/businessHours.admin.routes'
import appointmentRoutes from './modules/appointments/appointment.routes'
import appointmentAdminRoutes from './modules/appointments/appointment.admin.routes'
import intentRoutes from './modules/intents/intent.routes'

const app = express()

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[REQ] ${req.method} ${req.url}`)
  next()
})

app.get('/', (_req: Request, res: Response) =>
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Turnero API</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root { color-scheme: dark; }
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #0a0a0a; color: #e5e5e5;
      max-width: 640px; margin: 0 auto; padding: 4rem 1.5rem;
      line-height: 1.6;
    }
    h1 { font-size: 2rem; margin: 0 0 .25rem; letter-spacing: -.02em; }
    .meta { color: #888; margin-bottom: 2rem; }
    .status { color: #10b981; }
    .status::before { content: "● "; }
    h2 { font-size: .85rem; text-transform: uppercase; letter-spacing: .1em; color: #888; margin: 2rem 0 .75rem; font-weight: 500; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { padding: .4rem 0; border-bottom: 1px solid #1f1f1f; display: flex; gap: 1rem; }
    li:last-child { border: none; }
    .method { color: #60a5fa; min-width: 4.5rem; font-weight: 600; }
    .path { color: #e5e5e5; }
    .note { color: #666; font-size: .85rem; margin-left: auto; }
  </style>
</head>
<body>
  <h1>Turnero API</h1>
  <div class="meta"><span class="status">live</span> &middot; v1.0.0 &middot; ${env.businessName}</div>

  <h2>Publico</h2>
  <ul>
    <li><span class="method">GET</span><span class="path">/api/services</span></li>
    <li><span class="method">GET</span><span class="path">/api/business-hours</span></li>
    <li><span class="method">GET</span><span class="path">/api/appointments/availability</span></li>
    <li><span class="method">POST</span><span class="path">/api/appointments</span></li>
    <li><span class="method">POST</span><span class="path">/api/intents/parse</span><span class="note">lenguaje natural</span></li>
  </ul>

  <h2>Admin</h2>
  <ul>
    <li><span class="method">POST</span><span class="path">/api/auth/login</span></li>
    <li><span class="method">CRUD</span><span class="path">/api/admin/services</span><span class="note">Bearer token</span></li>
    <li><span class="method">GET/PUT</span><span class="path">/api/admin/business-hours</span><span class="note">Bearer token</span></li>
    <li><span class="method">GET/PATCH</span><span class="path">/api/admin/appointments</span><span class="note">Bearer token</span></li>
  </ul>
</body>
</html>`)
)

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }))

app.use(helmet())
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
)
app.use(express.json())

// Publico
app.use('/api/auth', authRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/business-hours', businessHoursRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/intents', intentRoutes)

// Admin (todo detras de JWT + rol admin)
app.use('/api/admin/services', authenticate, authorize('admin'), serviceAdminRoutes)
app.use('/api/admin/business-hours', authenticate, authorize('admin'), businessHoursAdminRoutes)
app.use('/api/admin/appointments', authenticate, authorize('admin'), appointmentAdminRoutes)

app.use(errorHandler)

export default app
