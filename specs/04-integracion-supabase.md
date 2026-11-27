# SPEC 04 — Integración base de Supabase

> **Status:** approved
> **Depends on:** SPEC 03
> **Date:** 2026-11-27
> **Objective:** Integrar Supabase en la app Next.js (dependencias, variables de entorno, clientes de navegador y servidor, y un script que compruebe la conexión) sin cambiar ninguna funcionalidad visible.

---

## Por qué existe este spec

La app no tiene backend: la sesión es un mock en `localStorage` (`lib/session.ts`) y los puntajes salen de `seededScores`. Vienen specs que necesitan Supabase (entre ellos, realtime y edge functions). Este spec deja solo los cimientos para que esos specs no tengan que resolver la configuración.

El proyecto de Supabase ya existe (ref `voyprmbgowayzlxshxkj`, configurado en `.mcp.json`) y hoy no tiene tablas ni migraciones. Este spec no cambia eso.

---

## Scope

**In:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas en `.env.example`; los valores reales van en `.env`.
- Lectura centralizada y validada de esas variables, con un error claro si faltan.
- Cliente de navegador (`createBrowserClient`) para Client Components.
- Cliente de servidor (`createServerClient` + `cookies()`) para Server Components, Server Actions y Route Handlers.
- Script `pnpm run check:supabase` que comprueba la URL y la clave contra el proyecto real.

**Out of scope (para futuros specs):**

- Autenticación: `/auth`, `lib/session.ts`, el nav y el modo invitado siguen como están. Google y GitHub siguen sin acción.
- `proxy.ts` para refrescar la sesión en cookies (va en el spec de auth).
- Tablas, políticas RLS, migraciones y la carpeta `supabase/`.
- Tipos TypeScript generados desde la base de datos.
- Puntajes reales, "Guardar puntuación" y Salón de la Fama desde la base de datos.
- Realtime.
- Edge Functions.
- Clave secreta (`sb_secret_…` / `service_role`) y cliente administrador.
- Guardar en base de datos los mensajes del formulario de contacto.
- Tests automatizados.

---

## Data model

Este spec no introduce datos ni tablas. Solo módulos de configuración:

```ts
// lib/supabase/env.ts
export function getSupabaseEnv(): { url: string; publishableKey: string };
// Lanza Error con el nombre de la variable que falta.
```

```ts
// lib/supabase/client.ts
export function createClient(); // SupabaseClient para el navegador
```

```ts
// lib/supabase/server.ts
export async function createClient(); // SupabaseClient ligado a las cookies de la petición
```

```bash
# .env.example (se añade a lo existente)
NEXT_PUBLIC_SUPABASE_URL=              # URL del proyecto (https://<ref>.supabase.co)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # clave publishable (sb_publishable_…), nunca la secreta
```

Convenciones:

- Las variables se leen como `process.env.NEXT_PUBLIC_…` literal, nunca con acceso dinámico (`process.env[nombre]`): Next solo las incluye en el bundle de cliente si la referencia es estática.
- La validación ocurre al llamar a `getSupabaseEnv()`, no al importar el módulo.
- El cliente de servidor se crea en cada petición; no se guarda en una variable global.
- `setAll` del cliente de servidor va dentro de `try/catch`, porque un Server Component no puede escribir cookies.
- `scripts/check-supabase.mjs` consulta `GET {url}/auth/v1/settings` con la cabecera `apikey`, con tiempo límite de 10 segundos. Termina con código 0 si la respuesta es 2xx y con código 1 en cualquier otro caso.
- El script nunca imprime la clave.

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/01-app` las guías de variables de entorno y `cookies()` con `cacheComponents`, tal como exige `AGENTS.md`; y consultar la guía vigente de Supabase "Creating a Supabase client for SSR" (vía MCP `search_docs`).

1. **Dependencias.** `pnpm add @supabase/supabase-js @supabase/ssr`. Verificación: `pnpm run build` pasa.
2. **Entorno.** Añadir las dos variables a `.env.example` sin valores y poner los valores reales en `.env` (la URL y la clave publishable se obtienen del dashboard o con el MCP). Verificación: `git status` no muestra `.env`.
3. **Lectura de variables.** Crear `lib/supabase/env.ts` con `getSupabaseEnv()`. Verificación: `pnpm exec tsc --noEmit` y `pnpm run lint` pasan.
4. **Clientes.** Crear `lib/supabase/client.ts` y `lib/supabase/server.ts` usando `getSupabaseEnv()`. Nada de la app los importa todavía. Verificación: `tsc` y `lint` pasan.
5. **Script de comprobación.** Crear `scripts/check-supabase.mjs` y añadir en `package.json` el script `"check:supabase": "node --env-file-if-exists=.env scripts/check-supabase.mjs"`. Verificación: `pnpm run check:supabase` responde OK.
6. **Cierre.** Probar los casos de error del script (variable ausente, clave errónea, URL inalcanzable) y ejecutar `pnpm run build` y `pnpm run lint`. Añadir `pnpm run check:supabase` a la sección "Commands" del `README.md`.

---

## Acceptance criteria

- [ ] `pnpm run build`, `pnpm run lint` y `pnpm exec tsc --noEmit` terminan sin errores.
- [ ] En `package.json` las únicas dependencias nuevas son `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] Existen `lib/supabase/env.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts` y `scripts/check-supabase.mjs`.
- [ ] `.env.example` contiene las dos variables nuevas sin valores y conserva las tres de Resend.
- [ ] `.env` no está versionado.
- [ ] Con valores correctos, `pnpm run check:supabase` muestra un mensaje de OK y termina con código 0.
- [ ] Sin alguna de las dos variables, el script nombra la variable que falta y termina con código 1.
- [ ] Con una clave errónea, el script muestra el estado HTTP y termina con código 1.
- [ ] Con una URL inalcanzable, el script muestra el error y termina con código 1 en un máximo de 10 segundos.
- [ ] La salida del script no contiene la clave en ningún caso.
- [ ] Una búsqueda de `sb_secret_` y `service_role` en `app/`, `components/`, `lib/`, `scripts/` y `.env.example` no devuelve coincidencias.
- [ ] Ni la URL ni la clave aparecen escritas en el código (`lib/`, `scripts/`).
- [ ] No hay cambios en `app/` ni en `components/`.
- [ ] No existen `proxy.ts` ni la carpeta `supabase/`.
- [ ] El proyecto de Supabase sigue sin tablas en `public` y sin migraciones.
- [ ] El login mock, la Biblioteca, el Salón y el formulario de contacto funcionan igual que antes.

---

## Decisions

- **Sí:** solo la integración. Decisión del usuario: auth, datos, realtime y edge functions se construyen en specs posteriores sobre esta base.
- **No:** incluir auth en este spec. Se valoró y se descartó para mantenerlo pequeño.
- **Sí:** `@supabase/ssr` junto a `@supabase/supabase-js`. Es el setup oficial para Next.js con sesiones en cookies, que necesitará el spec de auth.
- **No:** usar solo `supabase-js`. Obligaría a rehacer los clientes al añadir sesiones en servidor.
- **Sí:** dejar `proxy.ts` para el spec de auth. Sin sesiones no hay nada que refrescar y el proxy añadiría trabajo a cada petición.
- **Sí:** clave publishable. Es la clave pública vigente de Supabase y puede ir en el navegador.
- **No:** clave `anon` heredada.
- **No:** clave secreta. Nada de este spec necesita privilegios de administrador.
- **Sí:** estructura `lib/supabase/` con `client.ts` y `server.ts`, siguiendo la convención de la documentación de Supabase.
- **Sí:** `env.ts` como punto único de lectura. Evita las aserciones `!` repetidas y da un error legible.
- **Sí:** comprobar la conexión con un script. No expone nada en la web.
- **No:** ruta `/api/health`. Quedaría pública sin necesidad.
- **No:** verificar solo con build y tipos. No demuestra que la URL y la clave sean correctas.
- **Sí:** consultar `/auth/v1/settings`. Responde sin tablas y solo requiere la clave publishable.
- **No:** crear una tabla de prueba. Obligaría a introducir migraciones, que están fuera de alcance.
- **Sí:** valores en `.env`, como en el SPEC 03.

---

## Risks

| Riesgo                                                                                    | Mitigación                                                                                                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `.gitignore` solo ignora `.env`; un `.env.local` (el que sugiere Supabase) se versionaría | Usar exclusivamente `.env`.                                                                                                           |
| Poner por error la clave secreta en una variable `NEXT_PUBLIC_` la expone en el navegador | `.env.example` indica usar la publishable; criterio de aceptación busca `sb_secret_` y `service_role`.                                |
| Con `cacheComponents`, `cookies()` obliga a usar `Suspense` en quien llame al cliente     | Ningún componente lo usa todavía; el primer spec que lo use debe contemplarlo.                                                        |
| Sin `proxy.ts`, una sesión de servidor caducada no se refresca                            | No hay sesiones en este spec. El spec de auth **debe** añadir el proxy.                                                               |
| Los clientes no se usan desde la app y un fallo de ejecución pasaría desapercibido        | Aceptado: `tsc` valida los tipos y el script valida las credenciales; el primer spec que consulte datos los ejercita.                 |
| La API de Supabase o de Next 16 difiere del conocimiento previo                           | Leer la documentación vigente antes del paso 1.                                                                                       |
| El despliegue no tiene las variables nuevas                                               | Definirlas en el entorno de despliegue antes de que un spec posterior use los clientes; las `NEXT_PUBLIC_` se fijan durante el build. |

---

## What is **not** in this spec

- Autenticación real, `proxy.ts` y protección de rutas.
- Tablas, RLS, migraciones y tipos generados.
- Puntajes y ranking reales.
- Realtime y Edge Functions.
- Clave secreta o cliente administrador.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
