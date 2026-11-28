# SPEC 06 — Tabla de juegos y leaderboard con Supabase

> **Status:** approved
> **Depends on:** SPEC 04, SPEC 05
> **Date:** 2026-11-27
> **Objective:** Crear en Supabase las tablas de juegos y puntuaciones para que ASTEROIDS guarde puntajes reales y el Detalle y el Salón de la Fama muestren ese ranking.

---

## Por qué existe este spec

El SPEC 04 dejó Supabase conectado pero sin tablas ni migraciones. El SPEC 05 hizo jugable ASTEROIDS, pero "GUARDAR PUNTUACIÓN" no guarda nada y los rankings del Detalle y del Salón son inventados (`seededScores`). Este spec crea el primer dato persistente de la plataforma y fija cómo se registran los juegos reales que vengan después.

---

## Scope

**In:**

- Tabla `games` como registro de los juegos propios, con una sola fila: `asteroids`.
- Tabla `scores` con las puntuaciones guardadas, protegida con RLS y restricciones.
- Migración SQL versionada en `supabase/migrations/`, aplicada al proyecto con el MCP de Supabase.
- Tipos TypeScript generados desde la base y usados por los clientes de Supabase.
- Guardado de la puntuación de ASTEROIDS desde el modal, con el cliente de navegador.
- Estados de guardado: `GUARDANDO…`, guardado y error con reintento.
- Top 10 real en el Detalle de cada juego.
- Top 12 real y podio en el Salón de la Fama, con pestañas solo para los juegos de la tabla `games`.
- Fila "TU MEJOR MARCA" con la mejor puntuación guardada bajo el nombre de la sesión.
- Estados de carga, vacío y error al leer.
- Eliminar `seededScores`.

**Out of scope (para futuros specs):**

- Autenticación real, usuarios anónimos y `proxy.ts`.
- Protección contra trampas: validación de la partida en servidor, límite de peticiones o captcha.
- Realtime y Edge Functions.
- Leer el catálogo desde la base de datos: Home, Biblioteca, Detalle y Jugar siguen usando `lib/games.ts`.
- Registrar los 8 juegos demo en la tabla `games`.
- Cambiar `best` y `plays` (tarjetas y Detalle), que siguen siendo mock.
- Cambiar el guardado simulado de los juegos demo.
- Paginación, filtros por fecha y perfil de jugador.
- Editar o borrar puntuaciones desde la app.
- Tests automatizados.

---

## Data model

### Base de datos

```sql
create table public.games (
  id         text primary key,          -- mismo slug que en lib/games.ts
  title      text not null,
  created_at timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id),
  player_name text not null
    check (player_name = btrim(player_name) and char_length(player_name) between 1 and 10),
  score       integer not null check (score > 0 and score <= 10000000),
  created_at  timestamptz not null default now()
);

create index scores_ranking_idx
  on public.scores (game_id, score desc, created_at asc);

insert into public.games (id, title) values ('asteroids', 'ASTEROIDS');
```

Permisos para los roles `anon` y `authenticated`, con RLS activado en las dos tablas:

| Tabla    | Leer | Insertar                                   | Modificar | Borrar |
| -------- | ---- | ------------------------------------------ | --------- | ------ |
| `games`  | Sí   | No                                         | No        | No     |
| `scores` | Sí   | Sí, solo `game_id`, `player_name`, `score` | No        | No     |

La migración revoca los permisos por defecto y concede solo los de la tabla anterior, además de crear las políticas RLS de lectura e inserción.

### Código

```ts
// lib/scores/rules.ts
export const NAME_MAX = 10;
export const SCORE_MAX = 10_000_000;
export function canSaveScore(name: string, score: number): boolean;
```

```ts
// lib/scores/queries.ts
// Las funciones reciben el cliente, así sirven en servidor y navegador.
export type QueryResult<T> = { ok: true; data: T } | { ok: false };

export type BestMark = ScoreRow; // `rank` es la posición real en el ranking del juego

export function listGames(
   client,
): Promise<QueryResult<{ id: string; title: string }[]>>;
export function listTopScores(
   client,
   gameId: string,
   limit: number,
): Promise<QueryResult<ScoreRow[]>>;
export function getBestMark(
   client,
   gameId: string,
   name: string,
): Promise<QueryResult<BestMark | null>>;
export function saveScore(
   client,
   input: { gameId: string; name: string; score: number },
): Promise<QueryResult<null>>;
```

Estructura de archivos:

| Archivo                                          | Contenido                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `supabase/migrations/<version>_games_scores.sql` | Nuevo: tablas, índice, RLS, permisos y fila `asteroids`          |
| `lib/supabase/database.types.ts`                 | Nuevo: tipos generados                                           |
| `lib/supabase/client.ts`, `server.ts`            | Cambian: clientes tipados con `Database`                         |
| `lib/scores/rules.ts`                            | Nuevo: límites y validación                                      |
| `lib/scores/queries.ts`                          | Nuevo: consultas e inserción                                     |
| `components/leaderboard.tsx`                     | Nuevo: Server Component con el top 10 del Detalle                |
| `app/juegos/[id]/page.tsx`                       | Cambia: usa `Leaderboard` dentro de `<Suspense>`                 |
| `app/salon/page.tsx`                             | Cambia: carga juegos y puntuaciones en servidor con `<Suspense>` |
| `components/hall-client.tsx`                     | Cambia: recibe los datos por props y consulta la mejor marca     |
| `components/asteroids-player.tsx`                | Cambia: guarda en Supabase y maneja los estados                  |
| `components/game-over-modal.tsx`                 | Cambia: props opcionales de guardado                             |
| `lib/data.ts`                                    | Cambia: se eliminan `seededScores` y `PLAYERS`                   |
| `app/globals.css`                                | Cambia: estilos de carga, vacío, error y botón deshabilitado     |

Convenciones:

- Orden del ranking: `score` descendente y, en empate, `created_at` ascendente (gana la más antigua).
- Cada guardado es una fila; un nombre puede ocupar varios puestos.
- La app nunca envía `id` ni `created_at`; los pone la base de datos.
- El nombre se envía sin espacios en los extremos, en mayúsculas y con 10 caracteres como máximo.
- La fecha se muestra como `DD/MM/AAAA`, calculada en UTC.
- Las lecturas no se cachean: no se usa `use cache`; los datos se piden al cargar o navegar a la página.
- `await createClient()` de servidor queda fuera de cualquier `try/catch`, para no capturar el aviso de render dinámico de Next.
- Un error de consulta devuelve `{ ok: false }`; no se muestra el detalle técnico al jugador.
- Lecturas y escritura usan un tiempo límite de 10 segundos.
- Los juegos demo consultan igual que ASTEROIDS y reciben cero filas.

Textos de interfaz:

| Situación                       | Texto                                     |
| ------------------------------- | ----------------------------------------- |
| Cargando ranking                | `CARGANDO PUNTUACIONES…`                  |
| Ranking sin filas               | `AÚN NO HAY PUNTUACIONES`                 |
| Fallo de lectura                | `NO SE PUDIERON CARGAR LAS PUNTUACIONES`  |
| Guardando                       | `GUARDANDO…`                              |
| Guardado                        | `▸ PUNTUACIÓN GUARDADA_` (sin cambios)    |
| Fallo al guardar                | `NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.` |
| Puesto del podio sin puntuación | `---`                                     |

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/01-app` las guías de fetching de datos, caching con `cacheComponents` y `02-guides/preserving-ui-state.md`, tal como exige `AGENTS.md`; y consultar la documentación vigente de Supabase sobre RLS y permisos por columna (MCP `search_docs`). Aplicar `/frontend-design` según `CLAUDE.md`, respetando el estilo actual.

1. **Migración.** Escribir el SQL en `supabase/migrations/`, aplicarlo con el MCP (`apply_migration`) y nombrar el archivo con la versión que devuelva `list_migrations`. Revisar `get_advisors`. Verificación: existen las dos tablas, la fila `asteroids` y RLS está activo.
2. **Tipos.** Generar `lib/supabase/database.types.ts` y tipar los dos clientes. Verificación: `pnpm exec tsc --noEmit` pasa.
3. **Capa de puntuaciones.** Crear `lib/scores/rules.ts` y `lib/scores/queries.ts`. Verificación: `tsc` y `pnpm run lint` pasan.
4. **Guardado.** Añadir los estados opcionales a `GameOverModal` y conectar `AsteroidsPlayer` con `saveScore`. Verificación: una partida de ASTEROIDS crea una fila en `scores`; la demo se comporta como antes.
5. **Detalle.** Crear `components/leaderboard.tsx` y usarlo en `app/juegos/[id]/page.tsx`. Verificación: `/juegos/asteroids` muestra la fila guardada y `/juegos/rocas` el estado vacío.
6. **Salón.** Cargar los datos en `app/salon/page.tsx` y hacer que `hall-client.tsx` los reciba, con pestañas, podio con huecos y estados. Verificación: `/salon` muestra solo la pestaña `ASTEROIDS` con las puntuaciones reales.
7. **Mejor marca.** Consultar `getBestMark` desde `hall-client.tsx` con el nombre de la sesión. Verificación: la fila muestra la puntuación y posición reales.
8. **Limpieza y cierre.** Eliminar `seededScores` y `PLAYERS`, ejecutar `build`, `lint` y `tsc`, probar los casos de error y borrar de la base las filas de prueba.

---

## Acceptance criteria

**Base de datos**

- [ ] `list_migrations` muestra la migración y su SQL coincide con el archivo de `supabase/migrations/`.
- [ ] `games` contiene únicamente la fila `asteroids` / `ASTEROIDS`.
- [ ] `games` y `scores` tienen RLS activado.
- [ ] Con la clave publishable se pueden leer las dos tablas e insertar una puntuación válida.
- [ ] Se rechaza insertar: nombre vacío, de 11 caracteres o con espacios en los extremos; puntuación `0` o `10000001`; `game_id` inexistente; y cualquier inserción que envíe `id` o `created_at`.
- [ ] Se rechaza modificar o borrar puntuaciones e insertar en `games` con la clave publishable.
- [ ] `get_advisors` no reporta errores de seguridad sobre las tablas nuevas.

**Guardado**

- [ ] Guardar en ASTEROIDS crea exactamente una fila con el nombre, el puntaje final y `game_id = 'asteroids'`.
- [ ] El campo aparece relleno con el nombre de la sesión, o `INVITADO` sin sesión.
- [ ] El botón está deshabilitado con el nombre vacío o solo espacios, y con 0 puntos.
- [ ] Mientras guarda se ve `GUARDANDO…`, y pulsar repetidamente no crea más filas.
- [ ] Sin conexión aparece el mensaje de error y, al recuperarla, el mismo botón guarda la puntuación.
- [ ] Pulsar "JUGAR DE NUEVO" mientras guarda deja el modal de la partida siguiente sin estado de guardado ni error.
- [ ] En un juego demo el modal funciona como antes y no hace peticiones a Supabase.

**Detalle**

- [ ] `/juegos/asteroids` muestra como máximo 10 filas, en el orden definido.
- [ ] Dos puntuaciones iguales aparecen con la más antigua primero.
- [ ] Un juego demo muestra `AÚN NO HAY PUNTUACIONES`.
- [ ] Tras guardar y navegar al Detalle, la puntuación nueva aparece sin recargar el navegador.

**Salón**

- [ ] `/salon` muestra solo la pestaña `ASTEROIDS`, seleccionada.
- [ ] La tabla muestra como máximo 12 filas y el podio las tres primeras.
- [ ] Con menos de 3 puntuaciones, los puestos libres muestran `---`.
- [ ] Sin puntuaciones, la tabla muestra `AÚN NO HAY PUNTUACIONES`.
- [ ] Con sesión y una puntuación con ese nombre, "TU MEJOR MARCA" muestra la mejor, con su posición y fecha reales, aunque esté fuera del top 12.
- [ ] Sin sesión, o sin puntuaciones con ese nombre, la fila no aparece.
- [ ] Tras guardar y navegar al Salón, la puntuación nueva aparece sin recargar el navegador.

**Errores e integración**

- [ ] Con una URL de Supabase inalcanzable, el Detalle y el Salón muestran `NO SE PUDIERON CARGAR LAS PUNTUACIONES` y el resto de cada página funciona.
- [ ] Una búsqueda de `seededScores` en `app/`, `components/` y `lib/` no devuelve coincidencias.
- [ ] Una búsqueda de `sb_secret_` y `service_role` en `app/`, `components/` y `lib/` no devuelve coincidencias.
- [ ] Home, Biblioteca y las cifras "Mejor global" y "Partidas" se ven igual que antes.
- [ ] `pnpm run build`, `pnpm run lint` y `pnpm exec tsc --noEmit` terminan sin errores.
- [ ] La consola no muestra errores ni warnings de hydration.
- [ ] `package.json` no suma dependencias.

---

## Decisions

- **Sí:** un solo spec para la tabla de juegos y el leaderboard. Decisión del usuario.
- **No:** dividirlo en dos specs.
- **Sí:** `games` registra solo los juegos propios, hoy ASTEROIDS.
- **No:** mover el catálogo a la base de datos. Los 8 juegos demo siguen en `lib/games.ts` y la interfaz del catálogo no cambia.
- **Sí:** `games` mínima (`id`, `title`, `created_at`). Evita duplicar la ficha que ya está en el código.
- **Sí:** solo puntuaciones reales; los rankings inventados desaparecen.
- **Sí:** nombre libre sin autenticación. Se acepta que se pueda suplantar un nombre.
- **No:** auth anónima ni auth real. Van en el spec de autenticación.
- **Sí:** cada partida guardada es una fila, como en las recreativas.
- **No:** solo la mejor marca por nombre. Con nombre libre mezclaría a personas distintas.
- **Sí:** insertar desde el navegador. RLS y restricciones validan los datos.
- **No:** Server Action. La clave publishable ya permite insertar por REST, así que no añade seguridad.
- **Sí:** validación estricta en base de datos y modal.
- **Sí:** permisos por columna al insertar. Impide falsear la fecha que desempata.
- **Sí:** leer en servidor al cargar o navegar.
- **No:** Realtime.
- **Sí:** Salón con pestañas solo para juegos registrados; un juego nuevo aparece al añadir su fila.
- **Sí:** "TU MEJOR MARCA" real, buscada por nombre. Si esa consulta falla, la fila se oculta.
- **Sí:** podio siempre visible, con huecos.
- **No:** cambiar el guardado simulado de la demo. Decisión del usuario.
- **No:** calcular `best` y `plays`. Decisión del usuario: siguen mock.
- **Sí:** migración SQL en el repo y tipos generados. Cambia la restricción del SPEC 04, que excluía `supabase/`.
- Este spec reemplaza el criterio del SPEC 05 según el cual "GUARDAR PUNTUACIÓN" no hace peticiones de red.

---

## Risks

| Riesgo                                                                            | Mitigación                                                                                          |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Cualquiera puede insertar puntajes falsos o en masa con la clave publishable      | Aceptado: las restricciones limitan los valores. La protección contra trampas va en otro spec.      |
| La migración se aplica directamente al proyecto remoto                            | El proyecto no tiene datos; revisar el SQL antes de aplicarlo y consultar `get_advisors`.           |
| Si vence el tiempo límite pero la fila se insertó, el reintento la duplica        | Aceptado.                                                                                           |
| Una respuesta de guardado tardía marca como guardada la partida siguiente         | `AsteroidsPlayer` identifica cada partida y descarta las respuestas de partidas anteriores.         |
| `<Activity>` conserva el estado de guardado y error                               | Reiniciarlos junto al resto del estado cada vez que se crea o reinicia la partida.                  |
| La navegación reutiliza un ranking antiguo                                        | Lecturas sin caché y criterios que comprueban la actualización al navegar.                          |
| Con `cacheComponents`, leer fuera de `<Suspense>` rompe el build                  | Las lecturas de servidor van siempre dentro de `<Suspense>`.                                        |
| "Mejor global" mock no coincide con el ranking real                               | Aceptado hasta un spec posterior.                                                                   |
| La demo sigue diciendo "PUNTUACIÓN GUARDADA" sin guardar                          | Aceptado por decisión del usuario.                                                                  |
| Un juego real nuevo sin fila en `games` no puede guardar puntajes                 | Cada spec de juego nuevo debe añadir su fila con una migración, con el mismo `id` que en el código. |
| Faltan las variables de entorno en el despliegue y las páginas con ranking fallan | Definirlas antes de desplegar, como indica el SPEC 04.                                              |

---

## What is **not** in this spec

- Autenticación y protección contra trampas.
- Realtime y Edge Functions.
- Catálogo leído desde la base de datos.
- Estadísticas reales de `best` y `plays`.
- Cambios en los juegos demo.
- Paginación, filtros y perfiles.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
