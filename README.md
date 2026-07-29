# Turnero API

> Sistema de reservas/turnos para negocios con atención por horario (peluquerías, barberías, consultorios, talleres) — **TypeScript**, cálculo de disponibilidad en tiempo real, reserva por lenguaje natural con el proveedor de IA intercambiable, recordatorios automáticos por email y 167 tests.

[![CI](https://github.com/Tojohtml98/turnero-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Tojohtml98/turnero-api/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Tests](https://img.shields.io/badge/tests-167%20passing-brightgreen)](#testing)
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
- 🗣️ **Reserva por lenguaje natural** — `"quiero turno de corte mañana a las 3"` → `{ service, date, time }`. Interfaz `IntentParser` con 3 motores intercambiables por env var (determinístico / Ollama local / NVIDIA NIM en dev), sin acoplar la API a ningún proveedor
- 🧪 **167 tests** — auth, servicios, horario comercial, disponibilidad, reserva, condiciones de carrera, agenda admin, parseo de lenguaje natural. Corren 100% offline: ni el CI ni los tests necesitan una API de IA
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
│   ├── naturalDate.ts    # Logica PURA de fechas/horas en español (sin DB, sin IA)
│   └── mailer.ts         # Envio de emails (confirmacion + recordatorio)
├── jobs/
│   └── reminders.ts      # Cron diario de recordatorios
├── scripts/
│   └── seed.ts           # Crea el admin + horario default + servicios de ejemplo
└── modules/
    ├── auth/              # Login, refresh, logout (sin registro publico)
    ├── services/          # CRUD de servicios (publico: activos / admin: todos)
    ├── business-hours/    # Horario comercial (singleton, publico lectura / admin edicion)
    ├── appointments/      # Disponibilidad + reserva publica / agenda admin
    └── intents/           # Lenguaje natural -> intent
        ├── intent.types.ts    # La interfaz IntentParser + saneamiento de salida
        └── parsers/           # rules | ollama | nim | chain (adapters intercambiables)
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
| `POST` | `/api/intents/parse` | Interpreta un pedido en lenguaje natural (**no reserva**) |

### Admin (Bearer token)
| Method | Endpoint | Descripción |
|--------|----------|-------------|
| `GET/POST` | `/api/admin/services` | Listar todos / crear servicio |
| `PATCH/DELETE` | `/api/admin/services/:id` | Editar / borrar servicio |
| `GET/PUT` | `/api/admin/business-hours` | Ver / editar horario comercial |
| `GET` | `/api/admin/appointments?from&to&status` | Agenda filtrable |
| `PATCH` | `/api/admin/appointments/:id` | Confirmar/cancelar/completar/no-show, reprogramar |

## Reserva por lenguaje natural

`POST /api/intents/parse` recibe lo que el cliente escribiría en un WhatsApp y devuelve el turno estructurado. **No reserva**: eso sigue siendo `POST /api/appointments`, que es el único lugar donde se validan horario comercial y solapamientos.

```bash
curl -X POST http://localhost:3001/api/intents/parse \
  -H 'Content-Type: application/json' \
  -d '{"text":"quiero turno de corte mañana a las 3"}'
```

```json
{
  "text": "quiero turno de corte mañana a las 3",
  "parser": "rules",
  "intent": { "service": "Corte de pelo", "date": "2026-07-30", "time": "15:00" },
  "match": {
    "serviceId": "6889...",
    "name": "Corte de pelo",
    "durationMinutes": 30,
    "price": 5000
  },
  "missing": [],
  "ready": true
}
```

- `intent` es lo que se entendió del texto crudo.
- `match` ata ese texto a un servicio real del catálogo (`null` si el negocio no lo ofrece).
- `missing` + `ready` le dicen al front qué repreguntar. Con `ready: true` ya se puede llamar a `/api/appointments/availability` y reservar.

### El proveedor de IA es intercambiable

Toda la API habla contra una interfaz, nunca contra un proveedor:

```ts
interface IntentParser {
  parseIntent(text: string, context?: IntentContext): Promise<ParsedIntent>
}
```

Se elige con `INTENT_PARSER`, sin tocar código:

| Valor | Motor | Cuándo |
|---|---|---|
| `rules` *(default)* | Determinístico: regex + `lib/naturalDate.ts`. Sin red, sin IA. | Producción y tests. Es el piso: no se cae ni cambia de opinión. |
| `ollama` | Modelo local vía Ollama. | Producción con IA: sin costo por token y el mensaje no sale de la máquina. |
| `nim` | NVIDIA NIM (OpenAI-compatible). | **Solo desarrollo** — ver abajo. |
| `auto` | `ollama` → `nim` → `rules`, según lo configurado. | Dev: usa el mejor disponible y nunca queda sin respuesta. |

`ChainIntentParser` prueba los motores en orden y siempre termina en el determinístico, así que un modelo caído no puede tirar abajo el endpoint. Todo lo que devuelve un LLM pasa por `sanitizeIntent()`: una fecha que no sea `YYYY-MM-DD` real, o una hora que no sea `HH:mm`, se convierte en `null` antes de salir. Un modelo puede alucinar `"2026-13-45"` con total naturalidad; el resto de la API nunca lo ve.

### Por qué NIM no va a producción

El free tier de `build.nvidia.com` se rige por las [NVIDIA API Trial Terms of Service](https://assets.ngc.nvidia.com/products/api-catalog/legal/NVIDIA%20API%20Trial%20Terms%20of%20Service.pdf), que dicen textual:

> **1.2** — *"NVIDIA will provide you access to the API Service for limited trial purposes only and without use of the API Service or Generated Content in production."*
>
> **1.4** — *"Unless you purchase a Subscription from NVIDIA or a Service Provider, you may only use the API Service for internal testing and evaluation purposes, not in production."*

Además **3.3** permite a NVIDIA usar el contenido enviado para mejorar sus modelos, así que el mensaje de un cliente real no puede pasar por ahí.

Por eso `NimIntentParser` **se niega a arrancar con `NODE_ENV=production`** y `auto` lo excluye de la cadena en producción. El guard está testeado: es parte del contrato, no una precaución opcional.

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

Ver `.env.example` — incluye `ADMIN_EMAIL`/`ADMIN_PASSWORD` (para el seed), `BUSINESS_NAME`, SMTP opcional, `REMINDER_CRON_HOUR` y el bloque de lenguaje natural (`INTENT_PARSER` y la config de cada motor).

## Testing

```bash
npm test
```

```
Test Suites: 9 passed
Tests:       167 passed
  ✓ slots          — calculo puro de disponibilidad (sin DB)
  ✓ naturalDate    — fechas y horas en español (sin DB, sin IA)
  ✓ auth           — login, refresh, logout
  ✓ services       — CRUD publico/admin + validacion
  ✓ business-hours — horario, validacion, disponibilidad y guardas de reserva
  ✓ appointments   — disponibilidad, reserva, condiciones de carrera, agenda admin
  ✓ rules.parser   — parseo deterministico + saneamiento de salida
  ✓ parsers        — adapters de LLM (fetch mockeado), cadena de fallback, factory
  ✓ intents        — endpoint POST /api/intents/parse
```

**Los tests no salen a la red.** El motor por defecto es el determinístico y los adapters de LLM se prueban con `fetch` mockeado, así que el CI no necesita Ollama ni una API key. El setup de tests *fuerza* `INTENT_PARSER=rules` para que un `.env` local no pueda cambiar eso.

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
- Cerrar el círculo del lenguaje natural: `POST /api/intents/book`, que tome un intent con `ready: true` y reserve pasando por las mismas validaciones de `POST /api/appointments`
- Diálogo de repregunta cuando `missing` no está vacío (hoy la API dice qué falta; quién pregunta es el front)
- Canal de WhatsApp sobre `/api/intents/parse` (requiere API paga de WhatsApp Business)

## Frontend

El panel admin + página pública de reserva para esta API vive en [turnero-client](https://github.com/Tojohtml98/turnero-client).
