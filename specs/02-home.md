# SPEC 02 — Pantalla Home (landing) de Arcade Vault

> **Status:** implemented
> **Depends on:** SPEC 01
> **Date:** 2026-11-22
> **Objective:** Agregar la pantalla Home (landing) en `/` portada de `references/templates/home-about/`, mover la Biblioteca a `/games` y sumar "Inicio" y "Acerca de" al nav.

---

## Por qué existe este spec

El SPEC 01 dejó la Biblioteca en `/`. El template nuevo (`references/templates/home-about/`) trae una landing propia (`home.jsx`) y separa "Inicio" de "Biblioteca". Esto obliga a **reubicar la Biblioteca** y a revisar todos los enlaces que hoy apuntan a `/` esperando la Biblioteca. La pantalla About (`about.jsx`) queda para otro spec; aquí solo se deja el enlace del nav.

Los estilos de Home existen en `references/templates/home-about/styles.css` pero **no** están en `app/globals.css`. Hay que portarlos.

---

## Scope

**In:**

- Pantalla Home en `/` con las secciones del template: Hero, "¿Por qué Arcade Vault?", "Juegos disponibles ahora", Stats, "Actividad en vivo", "Precios" (con FAQ) y CTA final.
- Siluetas pixel decorativas flotantes en el hero (8 SVG).
- Animación `reveal` al hacer scroll (IntersectionObserver).
- Mover la Biblioteca de `/` a `/games` (contenido sin cambios).
- Actualizar enlaces que significan "Biblioteca" para que apunten a `/games`.
- Nav (escritorio y panel móvil): enlaces "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de".
- Portar a `app/globals.css` los estilos de Home, Actividad y Precios, más los keyframes que falten.
- Datos mock fijos y tipados en `lib/home-data.ts`.
- Textos en español, tal como el template.

**Out of scope (para futuros specs):**

- Pantalla About (`/about`) y su formulario de contacto. El enlace "Acerca de" apunta a `/about` y **dará 404 hasta ese spec**.
- Datos reales: actividad, top de hoy y stats son texto fijo, no se derivan de `lib/data.ts`.
- Backend, puntajes reales, contador de créditos funcional.
- Variantes de tema del template (`Theme variants`) y cualquier panel de "tweaks".
- Cambiar rutas existentes del SPEC 01 (`/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`).
- Abrir Auth en la pestaña de registro: "CREAR CUENTA" enlaza a `/auth` tal cual.
- Tests automatizados.

---

## Data model

```ts
// lib/home-data.ts
import type { GameColor } from '@/lib/types';

export type FeatureIconKind = 'GAMEPAD' | 'FREE' | 'TROPHY' | 'ROCKET';

export type Feature = {
   icon: FeatureIconKind;
   title: string; // ej. "JUEGOS CLÁSICOS"
   desc: string;
   color: GameColor; // clase CSS del feature-card
};

export type ActivityRow = {
   player: string; // ej. "NEONFOX"
   game: string; // nombre mostrado, texto fijo (no es id de juego)
   score: number;
   when: string; // ya formateado, ej. "hace 2 min"
   color: GameColor;
};

export type TopPlayer = { rank: number; player: string; score: number };

export type HomeStat = { n: string; u: string; s: string }; // ej. "12+", "JUEGOS", "Y CONTANDO"

export type FaqItem = { q: string; a: string };

export const FEATURES: Feature[]; // 4 elementos
export const ACTIVITY: ActivityRow[]; // 7 elementos
export const TOP_PLAYERS: TopPlayer[]; // 5 elementos
export const HOME_STATS: HomeStat[]; // 3 elementos
export const PRICE_FEATURES: string[]; // 6 elementos
export const FAQ: FaqItem[]; // 3 elementos
```

Convenciones:

- Todos los valores se copian literalmente de `home.jsx` (incluidos "12+ JUEGOS" y "Nuevos juegos cada mes", aunque el mock tenga 8 juegos).
- La sección "Juegos disponibles ahora" usa `GAMES.slice(0, 6)` de `lib/data.ts`; no se duplican juegos.
- Números con `toLocaleString("es-ES")`, como en el SPEC 01.
- El ancho de las barras del top es `100 - i * 16` por ciento, como en el template.

### Mapa de rutas (cambios)

| Pantalla   | Ruta antes | Ruta ahora | Componente                                     |
| ---------- | ---------- | ---------- | ---------------------------------------------- |
| Home       | —          | `/`        | Página servidor + `Reveal` cliente             |
| Biblioteca | `/`        | `/games`   | Página servidor + `LibraryClient` (sin tocar)  |
| Acerca de  | —          | `/about`   | **No existe aún** (404 hasta el spec de About) |

El resto de rutas del SPEC 01 no cambia.

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/01-app` las guías de `next/link`, `metadata` y Client Components con `cacheComponents`, tal como exige `AGENTS.md`. Aplicar `/frontend-design` según `CLAUDE.md`, con fidelidad al template por encima de reinterpretar.

1. **Mover la Biblioteca a `/games`.** Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (hero `av-hero` + `LibraryClient`) y `metadata` con título "Biblioteca". Cambiar a `/games` los enlaces que significan "Biblioteca": `app/juegos/[id]/page.tsx:74`, `components/hall-client.tsx:120` y `components/player-client.tsx:136`. Dejar `app/page.tsx` intacto por ahora. Verificación: `/games` muestra las 8 tarjetas; "VOLVER AL VAULT" y "VOLVER A LA BIBLIOTECA" llevan a `/games`.
2. **Estilos.** Copiar de `references/templates/home-about/styles.css` a `app/globals.css` los bloques `HOME PAGE` (líneas ~930–1070, incluye `.reveal` y keyframes `bounce` y `float`), `ACTIVITY` (~1621–1671) y `PRICING` (~1672–1726). Buscar con `grep` si faltan clases usadas por `home.jsx` (p. ej. `.lb-link`, `.ticker`) y copiarlas también. No copiar el bloque `ABOUT PAGE` ni `Theme variants`. Verificación: `npm run build` pasa y la Biblioteca se ve igual que antes.
3. **Datos mock.** Crear `lib/home-data.ts` con los tipos y constantes del modelo. Verificación: `npx tsc --noEmit` y `npm run lint` pasan.
4. **Componentes de presentación.** Crear `components/home-silhouettes.tsx` (8 SVG, servidor), `components/feature-icon.tsx` (4 íconos, servidor), `components/mini-card.tsx` (enlace `next/link` a `/juegos/[id]`, usa `cover-bg` + `game.cover`) y `components/reveal.tsx` (cliente: renderiza el elemento con clase `reveal`, agrega `in` con `IntersectionObserver` umbral 0.12 y deja de observar al entrar). Verificación: `tsc` y `lint` pasan.
5. **Página Home.** Reemplazar `app/page.tsx` con la landing: siete bloques en el orden del template, `className="home fade-in"` en el contenedor. Los CTAs son `Link` con las clases `btn xl …` del template: "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" a `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS" a `/auth`; "VER SALÓN →" a `/salon`. Dividir en subcomponentes si una pieza supera ~50 líneas. Verificación: `/` renderiza todas las secciones y sus enlaces navegan.
6. **Nav.** En `components/nav.tsx` agregar "Inicio" (`/`) y "Acerca de" (`/about`) en escritorio y panel móvil, con el orden del template: Inicio, Biblioteca, Salón de la Fama, Acerca de. Cambiar "Biblioteca" a `/games`. Activo: Inicio solo si `pathname === "/"`; Biblioteca si empieza con `/games` o `/juegos`; Acerca de si empieza con `/about`. El logo sigue yendo a `/`. Verificación: el activo cambia al navegar y el panel móvil muestra los cuatro enlaces.
7. **Metadata y cierre.** Añadir `metadata` a la Home (descripción para SEO; el título usa el `default` del layout). Verificación: `npm run build` y `npm run lint` pasan.

---

## Acceptance criteria

- [x ] `npm run build` termina sin errores y `npm run lint` sin errores.
- [ x] `/` muestra la Home y `/games` muestra la Biblioteca con sus 8 tarjetas, búsqueda y chips funcionando igual que antes.
- [x ] Ninguna pantalla muestra la Biblioteca en `/`: el hero "ARCADE VAULT" del SPEC 01 solo aparece en `/games`.
- [ x] El hero de la Home muestra el título en tres líneas ("EL ARCADE" / "CLÁSICO ESTÁ" / "DE VUELTA"), el texto "▸ INSERTA UNA MONEDA\_" y las 8 siluetas flotantes.
- [ x] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" navegan a `/games`.
- [x] "CREAR CUENTA" y "EMPEZAR GRATIS" navegan a `/auth` (sin parámetros).
- [x ] "VER SALÓN →" navega a `/salon`.
- [x ] "Juegos disponibles ahora" muestra exactamente 6 mini tarjetas (los 6 primeros de `GAMES`) y cada una navega a `/juegos/[id]`.
- [ ] "¿Por qué Arcade Vault?" muestra 4 tarjetas con ícono, título y descripción.
- [ ] Stats muestra 3 bloques: "12+ JUEGOS", "MILES DE PARTIDAS", "GLOBAL RANKING".
- [ ] "Actividad en vivo" muestra 7 filas en "ÚLTIMAS PUNTUACIONES" y 5 en "TOP JUGADORES · HOY", con las filas 1, 2 y 3 destacadas.
- [ ] "Precios" muestra el plan "JUGADOR VAULT" con "$0 / SIEMPRE", 6 beneficios y 3 preguntas de FAQ.
- [ ] Las secciones con `reveal` aparecen (clase `in`) al entrar al viewport y no se vuelven a ocultar al salir.
- [ ] El nav muestra "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de", en escritorio y en el panel móvil (≤ 840 px).
- [ ] En `/` el activo es "Inicio"; en `/games` y `/juegos/[id]` es "Biblioteca"; en `/salon` es "Salón de la Fama".
- [ ] "VOLVER AL VAULT" (Detalle y Reproductor) y "VOLVER A LA BIBLIOTECA" (Salón) navegan a `/games`.
- [ ] Iniciar sesión o entrar como invitado en `/auth` redirige a `/` (la Home).
- [ ] `/about` devuelve 404 (esperado hasta el spec de About).
- [ ] La Home no produce errores ni warnings de hydration en la consola.
- [ ] `app/globals.css` no contiene el bloque `ABOUT PAGE` ni `Theme variants` del template.
- [ ] No se instalaron dependencias nuevas (`package.json` sin cambios).

---

## Decisions

- **Sí:** Home en `/` y Biblioteca en `/games`. Es lo que el usuario eligió; la raíz es la landing y la Biblioteca queda como pantalla propia, igual que en el template.
- **No:** Home en `/inicio` con la Biblioteca en `/`. Deja la landing fuera de la raíz.
- **Sí:** Biblioteca en `/games` aunque el Detalle viva en `/juegos/[id]`. Se respeta la ruta pedida; la mezcla inglés/español en URLs se acepta y no se renombra `/juegos` en este spec para no romper el SPEC 01.
- **Sí:** el redirect de Auth sigue yendo a `/`. Ahora es la Home; cambia de significado pero no de código.
- **Sí:** agregar "Acerca de" al nav apuntando a `/about` ya, aunque dé 404. Decisión del usuario: deja el nav idéntico al template y el spec de About solo crea la ruta. Costo asumido: enlace roto temporal.
- **No:** agregar solo "Inicio" y esperar a About. Habría evitado el 404, pero el usuario prefirió el nav completo.
- **Sí:** "CREAR CUENTA" enlaza a `/auth` sin parámetros, igual que el template. No se toca `AuthForm`.
- **No:** `/auth?modo=registro`. Mejor UX, pero amplía el alcance a un componente existente.
- **Sí:** datos de actividad, top y stats fijos, copiados del template, en `lib/home-data.ts`. Fidelidad visual; son mock igual que el resto del MVP.
- **No:** derivarlos de `lib/data.ts` / `seededScores`. Se aleja del texto del template y no aporta valor sin backend.
- **Sí:** `Reveal` como único Client Component nuevo; el resto de la Home es servidor. Minimiza JS en cliente.
- **Sí:** copiar solo los bloques de CSS de Home, Actividad y Precios. About y temas pertenecen a otros specs.
- **Sí:** `Link` de `next/link` con clases `btn` en vez de `<button onClick>`. Da navegación real, prefetch y SEO.

---

## Risks

| Riesgo                                                                                                        | Mitigación                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Enlaces a `/` que deberían ser la Biblioteca se quedan sin actualizar                                         | El paso 1 lista los tres archivos y líneas conocidos; hacer `grep 'href="/"'` al terminar el paso 1.                         |
| "Acerca de" da 404 hasta el spec de About                                                                     | Decisión explícita del usuario; el criterio de aceptación lo documenta como esperado.                                        |
| `.reveal` deja el contenido en `opacity: 0` si JS falla o tarda en hidratar                                   | Aceptado: es el comportamiento del template. Si molesta, añadir `@media (prefers-reduced-motion)` que lo muestre sin animar. |
| `IntersectionObserver` y hydration: el estado `in` se agrega tras montar y puede diferir del HTML de servidor | Agregar la clase `in` solo desde `useEffect`, nunca en el render.                                                            |
| Faltan clases CSS del template al portar por bloques (p. ej. `.lb-link`)                                      | Paso 2: `grep` de cada clase usada en `home.jsx` contra `globals.css`.                                                       |
| Texto "12+ JUEGOS" contradice los 8 juegos del mock                                                           | Se mantiene a propósito (fidelidad al template); corregir cuando haya catálogo real.                                         |
| Next 16 cambia APIs respecto al conocimiento previo                                                           | Consultar `node_modules/next/dist/docs/` antes de escribir cada pieza, como en el SPEC 01.                                   |

---

## What is **not** in this spec

- La pantalla About ni su formulario de contacto (`/about` da 404; va en otro spec).
- Datos reales de actividad, ranking, stats o créditos.
- Variantes de tema y panel de tweaks del template.
- Cambios en las rutas `/juegos/...`, `/auth` y `/salon`.
- Abrir Auth directo en la pestaña de registro.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
