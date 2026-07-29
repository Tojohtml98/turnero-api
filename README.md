# Turnero API

> Sistema de reservas/turnos para negocios con atención por horario (peluquerías, barberías, consultorios, talleres) — **TypeScript**, cálculo de disponibilidad en tiempo real, recordatorios automáticos por email y 36 tests de integración.

[![CI](https://github.com/Tojohtml98/turnero-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Tojohtml98/turnero-api/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Tests](https://img.shields.io/badge/tests-36%20passing-brightgreen)](#testing)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)](#docker)

## Qué resuelve

Un negocio que atiende con turno pierde tiempo agendando por teléfono/WhatsApp y plata en ausentismo. Turnero le da al cliente final una página pública para reservar 24/7 y al dueño un panel para administrar servicios, horario y agenda — con un recordatorio automático por email el día antes para bajar las inasistencias.

### Highlights

- 🔷 **TypeScript, strict mode** — mismo estándar de arquitectura que [taskflow-api](https://github.com/Tojohtml98/taskflow-api)
- 🧮 **Cálculo de disponibilidad real** — función pura (`lib/slots.ts`) que cruza horario comercial, duración del servicio y turnos ya tomados; sin librerías externas de calendario
- 🔐 **Un solo admin, sin registro público** — se crea con `npm run seed`; nadie puede registrarse como dueño de un producto ya vendido
- 🧱 **Arquitectura por capas** — Route → Controller → Service → Repository → Model, igual que el resto del stack
- 🛡️ **Validación de schema en el borde** — zod valida y limpia cada body/query antes de llegar al controller
- 📧 **Confirmación + recordatorio por email** — best-effort: si no hay SMTP configurado, el sistema funciona igual y solo lo loguea, nunca rompe una reserva
- ⏰ **Recordatorio automático diario** — `node-cron` corre una vez al día y avisa a todos los turnos confirmados de mañana
- 🧪 **36 tests de integración** — auth, servicios, disponibilidad, reserva, condiciones de carrera, agenda admin
- 🐳 **Dockerizado** — `docker-compose up` levanta API + Mongo

## Tech Stack

- **Language:** TypeScript (strict)
- **Runtime:** Node.js
- **Framework:** Express
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (access token 15m + refresh token 7d)
- **Validation:** zod (schema por módulo, aplicado como middleware de ruta)
- **Email:** nodemailer (opcional, no rompe nada si falta)
- **Cron:** node-cron
- **Testing:** Jest + ts-jest + Supertest + mongodb-memory-server
- **Containerization:** Docker + Docker Compose

## Arquitectura

```
Request → Route → Controller → Service → Repository → Model
```

```
src/
├── config/              # Conexion a DB y env vars
├── middleware/           # JWT authenticate, role authorize, validacion, error handler
├── lib/
│   ├── slots.ts          # Logica PURA de disponibilidad (sin DB, testeable aislada)
│   └── mailer.ts         # Envio de emails (confirmacion + recordatorio)
├── jobs/
│   └── reminders.ts      # Cron diario de recordatorios
├── scripts/
│   └── seed.ts           # Crea el admin + horario default + servicios de ejemplo
└── modules/
    ├── auth/              # Login, refresh, logout (sin registro publico)
    ├── services/          # CRUD de servicios (publico: activos / admin: todos)
    ├── business-hours/    # Horario comercial (singleton, publico lectura / admin edicion)
    └── appointments/      # Disponibilidad + reserva publica / agenda admin
```

**Supuesto de MVP:** un solo recurso atendiendo (un peluquero, un consultorio). Si el negocio tiene varios profesionales en simultáneo, el overlap-check pasa a ser por profesional — no está en este alcance (ver "Próximos pasos").

## API Endpoints

### Auth
| Method | Endpoint | Auth |
|--------|----------|------|
| `POST` | `/api/auth/login` | ✗ |
| `POST` | `/api/auth/refresh` | ✗ |
| `POST` | `/api/auth/logout` | ✓ |

### Público (para la página de reserva)
| Method | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/services` | Servicios activos |
| `GET` | `/api/business-hours` | Horario de atención |
| `GET` | `/api/appointments/availability?serviceId&date` | Horarios libres para ese día |
| `POST` | `/api/appointments` | Reservar turno |

### Admin (Bearer token)
| Method | Endpoint | Descripción |
|--------|----------|-------------|
| `GET/POST` | `/api/admin/services` | Listar todos / crear servicio |
| `PATCH/DELETE` | `/api/admin/services/:id` | Editar / borrar servicio |
| `GET/PUT` | `/api/admin/business-hours` | Ver / editar horario comercial |
| `GET` | `/api/admin/appointments?from&to&status` | Agenda filtrable |
| `PATCH` | `/api/admin/appointments/:id` | Confirmar/cancelar/completar/no-show, reprogramar |

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB local (o Docker)

### Local setup

```bash
# 1. Clonar
git clone https://github.com/Tojohtml98/turnero-api
cd turnero-api

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env
# Editar .env: ADMIN_EMAIL / ADMIN_PASSWORD son obligatorios para el seed

# 4. Levantar MongoDB (o docker-compose up mongo -d)

# 5. Crear el admin + horario default + servicios de ejemplo
npm run seed

# 6. Arrancar el server (dev, hot reload)
npm run dev
```

La API queda en `http://localhost:3001`.

### Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Corre con hot reload (ts-node-dev) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Corre el build compilado (`dist/server.js`) — producción |
| `npm run typecheck` | Chequea tipos sin emitir |
| `npm run seed` | Crea admin + horario + servicios de ejemplo (una vez, por negocio) |
| `npm test` | Corre el test suite |

## Environment Variables

Ver `.env.example` — incluye `ADMIN_EMAIL`/`ADMIN_PASSWORD` (para el seed), `BUSINESS_NAME`, SMTP opcional y `REMINDER_CRON_HOUR`.

## Testing

```bash
npm test
```

```
Test Suites: 4 passed
Tests:       36 passed
  ✓ slots        — calculo puro de disponibilidad (sin DB)
  ✓ auth         — login, refresh, logout
  ✓ services     — CRUD publico/admin + validacion
  ✓ appointments — disponibilidad, reserva, condiciones de carrera, agenda admin
```

## Docker

```bash
# API + MongoDB
docker-compose up --build

# Despues, corre el seed una vez apuntando a ese Mongo
npm run seed
```

## Próximos pasos (fuera del MVP)

- Multi-profesional/multi-recurso (overlap-check por staff, no solo por negocio)
- Pago/seña al reservar
- Recordatorio por WhatsApp (hoy es email; WhatsApp requiere API paga)

## Frontend

El panel admin + página pública de reserva para esta API vive en [turnero-client](https://github.com/Tojohtml98/turnero-client).
