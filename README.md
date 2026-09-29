# My English Journey

Plataforma personal de aprendizaje de inglés con tutor de IA: programa estructurado de 90 días,
clases paso a paso, ejercicios interactivos auto-corregidos y evaluados por IA, y una capa
híbrida Gemini + OpenAI con fallback automático y control de costos.

Este repositorio contiene la **Fase 1**: la base completa de la aplicación (auth, base de
datos, capa de IA híbrida, dashboard, programa de 90 días, reproductor de clases y un
subconjunto de tipos de ejercicio) funcionando de punta a punta. Ver [Alcance de esta fase](#alcance-de-esta-fase-1) al final.

## Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + React Router + TanStack Query + React Hook Form + Zod + Framer Motion + Recharts + Lucide.
- **Backend**: Node.js + Express + TypeScript, arquitectura por capas (routes → controllers → services → repositories).
- **Base de datos**: Supabase (PostgreSQL + Auth + Row Level Security).
- **IA**: Google Gemini (principal) + OpenAI (fallback), con clasificación de errores, reintentos con backoff y control de presupuesto.
- **Monorepo**: npm workspaces (`frontend/`, `backend/`, `packages/shared/`).

## Estructura del proyecto

```
myEnglishJounary/
├── frontend/                 # App React (Vite)
├── backend/                  # API Express
├── packages/shared/          # Esquemas Zod y tipos compartidos entre frontend y backend
├── supabase/
│   ├── migrations/           # Migraciones SQL (schema + RLS), numeradas y ordenadas
│   ├── seed.sql              # Datos de ejemplo opcionales para desarrollo local
│   └── config.toml           # Configuración del Supabase CLI para desarrollo local
└── docs/
    └── rls-verification.md   # Razonamiento de las políticas RLS y cómo verificarlas
```

## Requisitos previos

- Node.js 20+ y npm 10+.
- Una cuenta de [Supabase](https://supabase.com) (plan gratuito alcanza para desarrollo).
- Una API key de [Google AI Studio](https://aistudio.google.com/app/apikey) (Gemini) y/o de [OpenAI](https://platform.openai.com/api-keys). Al menos una es necesaria para que los ejercicios de escritura libre se evalúen con IA; sin ninguna, el resto de la app funciona igual y esos ejercicios devuelven un estado "no se pudo evaluar" en vez de fallar.

## Instalación

```bash
npm install
```

Esto instala las dependencias de los tres workspaces (`frontend`, `backend`, `packages/shared`).

## Configurar variables de entorno

Copiá los archivos de ejemplo y completalos:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Backend (`backend/.env`)

| Variable | Requerida | Descripción |
|---|---|---|
| `PORT` | No (default 4000) | Puerto del servidor Express. |
| `CORS_ORIGIN` | No (default `http://localhost:5173`) | Origen permitido por CORS (URL del frontend). |
| `SUPABASE_URL` | Sí, para auth/datos | Project Settings → API en el dashboard de Supabase. |
| `SUPABASE_ANON_KEY` | Sí, para auth/datos | Misma pantalla, clave `anon public`. |
| `SUPABASE_SERVICE_ROLE_KEY` | No en Fase 1 | Reservada para tareas admin futuras. **Nunca** debe llegar al frontend. |
| `GEMINI_API_KEY` | No (recomendada) | Generar en [Google AI Studio](https://aistudio.google.com/app/apikey). |
| `GEMINI_MODEL` | No (default `gemini-3.5-flash-lite`, verificado el 2026-09-28) | La familia `gemini-1.5-*` fue retirada; ver `backend/src/services/ai/pricing.ts` para otros modelos ya tarifados. |
| `OPENAI_API_KEY` | No (recomendada como fallback) | Generar en [OpenAI Platform](https://platform.openai.com/api-keys). |
| `OPENAI_MODEL` | No (default `gpt-4o-mini`) | Ídem, verificar contra la documentación oficial. |

Sin `SUPABASE_URL`/`SUPABASE_ANON_KEY`, el backend arranca igual pero cualquier endpoint que
necesite datos devuelve `503 { code: "supabase_not_configured" }` en vez de fallar de forma
confusa. Sin ninguna key de IA, los ejercicios de `free_writing` se guardan con
`evaluation_status: "error"` y un mensaje claro, sin romper el resto del flujo.

### Frontend (`frontend/.env`)

| Variable | Requerida | Descripción |
|---|---|---|
| `VITE_SUPABASE_URL` | Sí, para login | Misma URL que el backend. |
| `VITE_SUPABASE_ANON_KEY` | Sí, para login | La clave `anon public` (segura de exponer en el navegador). Nunca la `service_role`. |
| `VITE_API_BASE_URL` | No (default `http://localhost:4000`) | URL del backend. |

## Configurar Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Copiá `Project URL` y la clave `anon public` a `backend/.env` y `frontend/.env`.
3. Aplicá las migraciones (elegí una opción):

   **Opción A — Supabase CLI (recomendada):**
   ```bash
   npx supabase login
   npx supabase link --project-ref <tu-project-ref>
   npx supabase db push
   ```

   **Opción B — SQL Editor manual:** copiá y ejecutá, en orden, cada archivo de
   `supabase/migrations/0001_...sql` a `0017_...sql` en el SQL Editor del dashboard de Supabase.

4. (Opcional) Datos de ejemplo: registrate primero desde la app (paso siguiente), copiá tu
   `user id` desde Authentication → Users, pegalo en `supabase/seed.sql` reemplazando el UUID
   de ejemplo, y ejecutá ese archivo en el SQL Editor. Esto crea un plan de 90 días con un
   primer día completamente armado (vocabulario, gramática y 3 ejercicios) para poder probar
   el flujo completo.

Ver [`docs/rls-verification.md`](docs/rls-verification.md) para el detalle de las políticas
RLS de cada tabla y cómo verificarlas manualmente con dos usuarios reales.

## Ejecutar en desarrollo

```bash
npm run dev
```

Esto compila `packages/shared` una vez y levanta backend (`http://localhost:4000`) y frontend
(`http://localhost:5173`) en paralelo. Sin las variables de Supabase configuradas, el frontend
igual carga pero muestra una pantalla de "Supabase no está configurado" al intentar entrar a
una ruta protegida.

## Scripts disponibles (raíz del monorepo)

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta backend + frontend en modo desarrollo. |
| `npm run build` | Compila `packages/shared`, `backend` y `frontend` en ese orden. |
| `npm run typecheck` | Corre `tsc --noEmit` en los tres workspaces. |
| `npm run lint` | Corre el linter de `backend` (eslint) y `frontend` (oxlint). |
| `npm run test` | Corre la suite de tests del backend (Vitest, proveedores de IA mockeados). |
| `npm run migrate` | Atajo a `supabase db push` (requiere `supabase link` previo). |

## Pruebas realizadas

- **Backend**: 38 tests con Vitest cubriendo:
  - `requireAuth`: token ausente, inválido, válido, y errores inesperados del cliente de Supabase (con un cliente mockeado, sin pegarle a un proyecto real).
  - Validadores de ejercicios cerrados (multiple choice, fill-in-blank, traducción): normalización de mayúsculas/espacios/puntuación.
  - `AIErrorClassifier`: clasificación de rate limit vs quota exceeded vs auth vs invalid request vs safety block, y qué categorías son reintentables/elegibles para fallback.
  - `AIRouter`: éxito directo, retry con backoff ante error reintentable, fallback de Gemini a OpenAI, no-fallback ante error terminal, agotamiento de ambos proveedores, bloqueo por presupuesto, y respeto de `provider_mode` (`auto`/`gemini_only`/`openai_only`).
  - `AIUsageService`: cálculo de costo contra la tabla de precios, bloqueo de presupuesto, y registro de éxitos/fallos.
- **Build/typecheck**: `npm run build` y `npm run typecheck` verdes en los tres workspaces.
- **Arranque real**: el backend compilado (`dist/server.js`) se probó sin ningún `.env` — `/api/health` responde `200` con las banderas de configuración en `false`, y un endpoint protegido como `/api/dashboard/summary` responde `503` con un mensaje claro en vez de un error genérico.
- **Verificado contra un proyecto Supabase real** (además de los tests mockeados): las 17 migraciones se aplicaron sin errores; el trigger `handle_new_user` crea el `profiles` automáticamente al registrar un usuario; `/api/auth/me` y `/api/dashboard/summary` responden correctamente con un JWT real emitido por Supabase Auth; y se confirmó el aislamiento de RLS entre dos usuarios reales (el usuario B recibe `[]` al intentar leer el perfil del usuario A, y ve el suyo propio sin problema). La API key de Gemini también se validó contra `generativelanguage.googleapis.com`.
- **No verificado todavía**: una llamada real de evaluación de IA de punta a punta (requiere sembrar una clase completa) y el fallback real a OpenAI (no se cargó esa key). El mecanismo está cubierto por los tests unitarios con proveedores mockeados.

## Alcance de esta fase (Fase 1)

**Implementado y funcional:**
- Autenticación completa (registro, login, recuperación de contraseña, logout, rutas protegidas, perfil) vía Supabase Auth.
- Esquema completo de base de datos (15 tablas + `plan_days`) con RLS en todas, migraciones SQL versionadas.
- Capa híbrida de IA (Gemini → OpenAI) con clasificación de errores, backoff con jitter, fallback automático, registro de uso/costo y bloqueo preventivo por presupuesto.
- Dashboard con datos reales de Supabase (sin métricas simuladas) y estados vacíos diseñados.
- Programa de 90 días: estructura de semanas/días, reproductor de clases paso a paso con guardado automático de progreso.
- 4 de los 10 tipos de ejercicio: multiple choice, fill-in-blank, traducción (ambas direcciones) — auto-corregidos — y free writing evaluado por IA con feedback estructurado (errores gramaticales vs alternativas naturales vs recomendación).

**Deliberadamente pendiente para próximas iteraciones** (con su tabla ya lista en el esquema):
- Speaking Lab (grabación de audio, transcripción, Supabase Storage con políticas privadas).
- Vocabulary Bank con repetición espaciada (UI; el algoritmo SM-2 y la tabla ya existen).
- Error Journal alimentando la regeneración del plan de estudio.
- Pantalla de Estadísticas con Recharts (necesita historial real acumulado).
- Pantalla de Configuración completa (el backend ya respeta `user_ai_settings` y los campos de perfil; falta la UI unificada).
- Los 6 tipos de ejercicio restantes (word ordering, reading/listening comprehension, sentence construction, grammar error correction) — extensión mecánica del patrón ya establecido.
- Conversación de voz en tiempo real y evaluación fonética real de pronunciación.

## Despliegue

No incluido en esta fase. Sugerencia para cuando corresponda: frontend en Vercel/Netlify
(build estático de Vite), backend en Railway/Render/Fly.io (necesita un proceso Node
persistente), y Supabase ya es un servicio administrado. Recordá configurar `CORS_ORIGIN` en
el backend con el dominio real del frontend en producción.
