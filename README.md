# My English Journey

Plataforma personal de aprendizaje de inglés con tutor de IA: programa estructurado de 90 días,
clases paso a paso, ejercicios interactivos auto-corregidos y evaluados por IA, y una capa
híbrida Gemini + OpenAI con fallback automático y control de costos.

Este repositorio contiene la **Fase 1**: la base completa de la aplicación (auth, base de
datos, capa de IA híbrida, dashboard, programa de 90 días, reproductor de clases y un
subconjunto de tipos de ejercicio) funcionando de punta a punta. Ver [Alcance de esta fase](#alcance-de-esta-fase-1) al final.

## Stack

- **App**: Next.js (App Router) + TypeScript + Tailwind CSS + TanStack Query + React Hook Form + Zod + Framer Motion + Recharts + Lucide. Un solo proyecto: la UI y la API (`src/app/api`, Route Handlers) se despliegan juntas en Vercel.
- **API**: Route Handlers de Next con arquitectura por capas (route → services → repositories). `src/server/http/handler.ts` aplica disponibilidad de servicios → auth (cliente Supabase con RLS) → validación Zod → manejo de errores.
- **Base de datos**: Supabase (PostgreSQL + Auth + Row Level Security + Storage).
- **IA**: Google Gemini (principal) + OpenAI (fallback), con clasificación de errores, reintentos con backoff y control de presupuesto.

## Estructura del proyecto

```
myEnglishJounary/
├── src/
│   ├── app/                  # Rutas de Next (páginas) y API (src/app/api/**/route.ts)
│   ├── views/                # Pantallas (client components) usadas por las rutas
│   ├── components/ hooks/ context/ lib/ utils/   # UI y estado del cliente
│   ├── server/               # Solo servidor: config, services, repositories, http helpers
│   └── shared/               # Esquemas Zod y tipos compartidos (alias @myenglishjourney/shared)
├── supabase/
│   ├── migrations/           # Migraciones SQL (schema + RLS), numeradas y ordenadas
│   ├── seed.sql              # Datos de ejemplo opcionales para desarrollo local
│   └── config.toml           # Configuración del Supabase CLI para desarrollo local
└── docs/
    └── rls-verification.md   # Razonamiento de las políticas RLS y cómo verificarlas
```

## Requisitos previos

- Node.js 22+ y npm 10+.
- Una cuenta de [Supabase](https://supabase.com) (plan gratuito alcanza para desarrollo).
- Una API key de [Google AI Studio](https://aistudio.google.com/app/apikey) (Gemini) y/o de [OpenAI](https://platform.openai.com/api-keys). Sin ninguna, el resto de la app funciona igual y los ejercicios de escritura libre devuelven "no se pudo evaluar" en vez de fallar. El Speaking Lab requiere Gemini.

## Instalación y desarrollo

```bash
npm install
cp .env.example .env.local   # completar las variables
npm run dev                  # http://localhost:3000
```

Otros scripts: `npm run build`, `npm start`, `npm test`, `npm run typecheck`, `npm run lint`.

## Variables de entorno (`.env.local`)

| Variable | Requerida | Descripción |
|---|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Sí | Project Settings → API. Usadas por las rutas de API. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sí | Mismos valores, expuestos al navegador (login y subida de audio). Nunca la `service_role`. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Reservada para tareas admin futuras. **Nunca** debe llegar al navegador. |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Recomendada | Default `gemini-3.5-flash-lite`; ver `src/server/services/ai/pricing.ts` para otros modelos tarifados. |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Opcional (fallback) | Default `gpt-4o-mini`. |

Sin `SUPABASE_URL`/`SUPABASE_ANON_KEY`, los endpoints que necesitan datos devuelven
`503 { code: "supabase_not_configured" }`. Sin keys de IA, `free_writing` se guarda con
`evaluation_status: "error"` y un mensaje claro.

## Deploy (Vercel)

Importar el repo en Vercel (Framework Preset: Next.js) y cargar las variables de entorno de arriba.
Las rutas de IA (`learning-plan/generate`, `speaking/sessions`, `exercises/.../attempts`) declaran `maxDuration`
para dar margen a las llamadas a los LLM. Los audios de Speaking se suben directo desde el navegador al bucket
privado `speaking-audio` de Supabase y la API solo recibe su ruta (evita el límite de body de las funciones serverless).

## Configurar Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Copiá `Project URL` y la clave `anon public` a `.env.local`.
3. Aplicá las migraciones (elegí una opción):

   **Opción A — Supabase CLI (recomendada):**
   ```bash
   npx supabase login
   npx supabase link --project-ref <tu-project-ref>
   npx supabase db push
   ```

   **Opción B — SQL Editor manual:** copiá y ejecutá, en orden, cada archivo de
   `supabase/migrations/0001_...sql` a `0018_...sql` en el SQL Editor del dashboard de Supabase.

4. (Opcional) Datos de ejemplo: registrate primero desde la app (paso siguiente), copiá tu
   `user id` desde Authentication → Users, pegalo en `supabase/seed.sql` reemplazando el UUID
   de ejemplo, y ejecutá ese archivo en el SQL Editor. Esto crea un plan de 90 días con un
   primer día completamente armado (vocabulario, gramática y 3 ejercicios) para poder probar
   el flujo completo.

Ver [`docs/rls-verification.md`](docs/rls-verification.md) para el detalle de las políticas
RLS de cada tabla y cómo verificarlas manualmente con dos usuarios reales.

## Pruebas realizadas

- **Tests**: 43 tests con Vitest cubriendo:
  - `authenticate`: token ausente, inválido, válido, y errores inesperados del cliente de Supabase (con un cliente mockeado, sin pegarle a un proyecto real).
  - Validadores de ejercicios cerrados (multiple choice, fill-in-blank, traducción): normalización de mayúsculas/espacios/puntuación.
  - `AIErrorClassifier`: clasificación de rate limit vs quota exceeded vs auth vs invalid request vs safety block, y qué categorías son reintentables/elegibles para fallback.
  - `AIRouter`: éxito directo, retry con backoff ante error reintentable, fallback de Gemini a OpenAI, no-fallback ante error terminal, agotamiento de ambos proveedores, bloqueo por presupuesto, y respeto de `provider_mode` (`auto`/`gemini_only`/`openai_only`).
  - `AIUsageService`: cálculo de costo contra la tabla de precios, bloqueo de presupuesto, y registro de éxitos/fallos.
- **Build/typecheck**: `npm run build`, `npm run typecheck` y `npm test` verdes tras la migración a Next.js.
- **Arranque real**: tras migrar a Next.js, `next start` se probó sin ningún `.env` — `/api/health` responde `200` con las banderas de configuración en `false`, y un endpoint protegido como `/api/dashboard/summary` responde `503` con un mensaje claro en vez de un error genérico.
- **Verificado contra un proyecto Supabase real** (además de los tests mockeados): las 18 migraciones se aplicaron sin errores; el trigger `handle_new_user` crea el `profiles` automáticamente al registrar un usuario; `/api/auth/me` y `/api/dashboard/summary` responden correctamente con un JWT real emitido por Supabase Auth; y se confirmó el aislamiento de RLS entre dos usuarios reales (el usuario B recibe `[]` al intentar leer el perfil del usuario A, y ve el suyo propio sin problema). La API key de Gemini también se validó contra `generativelanguage.googleapis.com`.
- **Generación de plan verificada end-to-end**: se generó un plan de 90 días real (60 lección/12 repaso/12 descanso/6 evaluación) con Gemini, incluyendo la clase completa del día 1, y se enviaron respuestas reales a los 4 tipos de ejercicio implementados — incluyendo free writing con errores gramaticales deliberados, que la IA detectó y corrigió correctamente sin fingir que estaba perfecto.
- **Speaking Lab verificado end-to-end**: se subió un audio a Supabase Storage (bucket privado `speaking-audio`, políticas RLS por carpeta de usuario), se envió a Gemini como audio inline, y se persistió el resultado. Con un tono sintético (sin habla real, ya que este entorno no tiene micrófono), la IA correctamente reportó que no detectó habla en vez de inventar una transcripción — confirma que el pipeline completo (audio → Storage → Gemini → persistencia) funciona; la calidad de transcripción con voz real queda para que la pruebes vos desde el navegador.
- **No verificado todavía**: el fallback real a OpenAI (no se cargó esa key — cubierto por tests unitarios con proveedores mockeados) y la calidad de transcripción de Speaking Lab con voz humana real.

## Alcance de esta fase (Fase 1)

**Implementado y funcional:**
- Autenticación completa (registro, login, recuperación de contraseña, logout, rutas protegidas, perfil) vía Supabase Auth.
- Esquema completo de base de datos (15 tablas + `plan_days`) con RLS en todas, migraciones SQL versionadas.
- Capa híbrida de IA (Gemini → OpenAI) con clasificación de errores, backoff con jitter, fallback automático, registro de uso/costo y bloqueo preventivo por presupuesto.
- Dashboard con datos reales de Supabase (sin métricas simuladas) y estados vacíos diseñados.
- Programa de 90 días: estructura de semanas/días, reproductor de clases paso a paso con guardado automático de progreso.
- 4 de los 10 tipos de ejercicio: multiple choice, fill-in-blank, traducción (ambas direcciones) — auto-corregidos — y free writing evaluado por IA con feedback estructurado (errores gramaticales vs alternativas naturales vs recomendación).
- Generación real del plan de 90 días con IA: a partir de nivel actual/objetivo, minutos diarios y áreas de enfoque, Gemini genera el esqueleto completo de 90 días (con relleno automático si el modelo entrega menos) y la clase completa del día 1.
- Speaking Lab: grabación de audio en el navegador (MediaRecorder), subida a un bucket privado de Supabase Storage con políticas RLS por usuario, y análisis por IA enviando el audio directamente a Gemini (transcripción + errores gramaticales + vocabulario sugerido + expresión más natural + traducción). Deja explícito en la UI que analiza la transcripción, no la pronunciación real. El fallback a OpenAI no aplica acá (no tiene entrada de audio en esta implementación) — estas solicitudes siempre van a Gemini.

**Deliberadamente pendiente para próximas iteraciones** (con su tabla ya lista en el esquema):
- Vocabulary Bank con repetición espaciada (UI; el algoritmo SM-2 y la tabla ya existen).
- Error Journal alimentando la regeneración del plan de estudio.
- Pantalla de Estadísticas con Recharts (necesita historial real acumulado).
- Pantalla de Configuración completa (el backend ya respeta `user_ai_settings` y los campos de perfil; falta la UI unificada).
- Los 6 tipos de ejercicio restantes (word ordering, reading/listening comprehension, sentence construction, grammar error correction) — extensión mecánica del patrón ya establecido.
- Conversación de voz en tiempo real y evaluación fonética real de pronunciación.

## Despliegue

Ver la sección [Deploy (Vercel)](#deploy-vercel) más arriba. Supabase es un servicio administrado; en
Authentication → URL Configuration agregá el dominio de Vercel como Site URL y `https://<dominio>/reset-password`
como Redirect URL.
