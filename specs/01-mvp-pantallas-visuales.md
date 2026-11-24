# SPEC 01 — MVP visual de Arcade Vault (todas las pantallas)

> **Status:** implemented
> **Depends on:** Ninguno
> **Date:** 2026-11-22
> **Objective:** Portar a Next.js (App Router, rutas reales) las cinco pantallas del template `references/templates/` con datos mock, sin implementar ningún juego.

---

## Por qué existe este spec

El template en `references/templates/` es un SPA con React por CDN, Babel y navegación por hash. El proyecto es Next.js 16 con App Router, así que el trabajo no es copiar archivos sino **traducir** el diseño a rutas reales, componentes tipados y datos mock. Los estilos ya están portados en `app/globals.css` y el layout (`app/layout.tsx`) ya carga las fuentes y los fondos `.av-bg` / `.av-noise`; este spec los reutiliza sin rediseñar nada.

---

## Scope

**In:**

- Cinco pantallas: Biblioteca, Detalle de juego, Reproductor (placeholder), Auth y Salón de la Fama.
- Nav y footer compartidos, incluido el menú móvil (hamburguesa + panel lateral).
- Rutas reales del App Router.
- Datos mock tipados en TypeScript (`Game`, `ScoreRow`) y `seededScores` determinista.
- Sesión mock en `localStorage` (clave `av_user`), con nav que refleja el usuario.
- Reproductor con arena de demostración: HUD, pausa, FIN, overlay de "Fin del juego" y simulación de puntaje del template.
- Búsqueda y filtro por categoría en la Biblioteca (estado cliente).
- Pestañas por juego en el Salón de la Fama, con podio y tabla.
- Textos en español, igual que el template.

**Out of scope (para futuros specs):**

- Cualquier juego real (lógica, canvas, controles, colisiones).
- Backend, base de datos, autenticación real, OAuth (Google/GitHub son botones sin acción).
- Persistencia de puntajes: el botón "Guardar puntuación" solo muestra el toast, no guarda nada.
- Puntajes reales en Biblioteca, Detalle y Salón: todo sale de mock.
- Contador de créditos funcional: es texto fijo `CRÉDITOS · 03`.
- Validación de formularios, recuperación de contraseña, perfil de usuario.
- Tests automatizados (el repo no tiene test runner).
- i18n: solo español.

---

## Data model

```ts
// lib/types.ts
export type GameCategory = 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';
export type GameColor = 'cyan' | 'magenta' | 'yellow' | 'green';

export type Game = {
   id: string; // slug, ej. "bloque-buster"
   title: string; // ej. "BLOQUE BUSTER"
   short: string; // descripción de la tarjeta
   long: string; // descripción del detalle
   cat: GameCategory;
   cover: string; // clase CSS existente, ej. "cover-bricks"
   color: GameColor; // color del botón JUGAR
   best: number;
   plays: string; // ya formateado, ej. "12.4K"
};

export type ScoreRow = {
   rank: number;
   name: string;
   score: number;
   date: string; // "DD/MM/2026"
};

export type SessionUser = { name: string }; // máx. 10 caracteres, mayúsculas
```

```ts
// lib/data.ts
export const GAMES: Game[]; // los 8 juegos de data.jsx
export const CATS: readonly string[]; // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function seededScores(seed: number, count?: number): ScoreRow[];
export function getGame(id: string): Game | undefined;
```

Convenciones:

- `seededScores` es determinista (PRNG con semilla, sin `Math.random`) para evitar hydration mismatch.
- Sesión: `localStorage["av_user"]` guarda `SessionUser` serializado, o no existe si no hay sesión.
- La sesión se lee con `useSyncExternalStore` (snapshot de servidor `null`) para evitar hydration mismatch.
- Números con `toLocaleString("es-ES")`.

### Mapa de rutas

| Pantalla    | Ruta                 | Template origen   | Tipo de componente                        |
| ----------- | -------------------- | ----------------- | ----------------------------------------- |
| Biblioteca  | `/`                  | `biblioteca.jsx`  | Página servidor + `LibraryClient` cliente |
| Detalle     | `/juegos/[id]`       | `detalle.jsx`     | Página servidor, `generateStaticParams`   |
| Reproductor | `/juegos/[id]/jugar` | `reproductor.jsx` | Página servidor + `PlayerClient` cliente  |
| Auth        | `/auth`              | `auth.jsx`        | Página servidor + `AuthForm` cliente      |
| Salón       | `/salon`             | `salon.jsx`       | Página servidor + `HallClient` cliente    |

Un `id` inexistente en `/juegos/[id]` y `/juegos/[id]/jugar` llama a `notFound()`.

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/01-app` las guías de rutas dinámicas, `cacheComponents`, `generateStaticParams`, `notFound` y `next/link`, tal como exige `AGENTS.md`.

1. **Datos y tipos.** Crear `lib/types.ts` y `lib/data.ts` portando `data.jsx`. Verificación: `pnpm run lint` y `pnpm exec tsc --noEmit` pasan.
2. **Sesión mock.** Crear `lib/session.ts` (hook `useSession` con `useSyncExternalStore`, `login(name)`, `logout()`) sobre `localStorage["av_user"]`. Verificación: `tsc` pasa.
3. **Nav y footer.** Crear `components/nav.tsx` (cliente, con `next/link`, estado activo por `usePathname`, menú móvil) y `components/footer.tsx`. Montarlos en `app/layout.tsx` sobre un `<main className="av-main">`. Reemplazar el contenido de `app/page.tsx` por un stub. Verificación: `pnpm run dev` muestra nav y footer; el menú móvil abre y cierra.
4. **Biblioteca.** Crear `components/game-card.tsx` (con efecto tilt) y `components/library-client.tsx` (búsqueda + chips). `app/page.tsx` renderiza hero + `LibraryClient`. Verificación: 8 tarjetas; filtrar por "PUZZLE" deja 1; buscar "xyz" muestra "NO HAY RESULTADOS".
5. **Detalle.** Crear `app/juegos/[id]/page.tsx` con `generateStaticParams`, `notFound()` y leaderboard de 10 filas. "JUGAR AHORA" enlaza a `/juegos/[id]/jugar`. Verificación: `/juegos/caida` renderiza; `/juegos/nope` da 404.
6. **Auth.** Crear `app/auth/page.tsx` y `components/auth-form.tsx` (tabs, campo de correo solo en "CREAR CUENTA", botón invitado, botones sociales inertes). Submit llama `login` y navega a `/` con `router.push`. Verificación: tras entrar, la nav muestra el nombre en mayúsculas.
7. **Cierre de sesión.** Hacer que el botón de usuario de la nav ejecute `logout`. Verificación: tras salir, la nav vuelve a "Iniciar Sesión" y `localStorage["av_user"]` no existe.
8. **Reproductor.** Crear `app/juegos/[id]/jugar/page.tsx` y `components/player-client.tsx`: HUD, arena de demostración, pausa, FIN, overlay "FIN DEL JUEGO" con input de iniciales y toast de guardado (sin persistir), "JUGAR DE NUEVO" y "VOLVER AL VAULT". Dividir en subcomponentes si supera ~50 líneas por pieza. Verificación: el puntaje sube cada ~220 ms; pausa lo detiene; FIN abre el modal.
9. **Salón de la Fama.** Crear `app/salon/page.tsx` y `components/hall-client.tsx`: pestañas por juego, podio, tabla y fila "TU MEJOR MARCA" solo con sesión. Verificación: cambiar de pestaña cambia podio y tabla; sin sesión no aparece la fila propia.
10.   **Metadata y limpieza.** Añadir `metadata` por ruta (título por pantalla) y borrar assets del scaffold que queden sin uso (`public/next.svg`, etc.). Verificación: `pnpm run build` y `pnpm run lint` pasan.

---

## Acceptance criteria

- [ x] `pnpm run build` termina sin errores y `pnpm run lint` sin errores.
- [x ] Existen las rutas `/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth` y `/salon`, y todas cargan sin errores ni warnings de hydration en la consola.
- [x ] `/juegos/inexistente` y `/juegos/inexistente/jugar` devuelven 404.
- [ x] La Biblioteca muestra 8 tarjetas; el chip "TODOS" las muestra todas y cada otro chip filtra por `cat`.
- [ x] Buscar un texto sin coincidencias muestra "NO HAY RESULTADOS".
- [x ] Hacer clic en una tarjeta o en su botón JUGAR navega a `/juegos/[id]`.
- [x ] El Detalle muestra título, descripción, 3 métricas y 10 filas de leaderboard, con top 1, 2 y 3 destacados.
- [x ] "JUGAR AHORA" navega a `/juegos/[id]/jugar`; "VOLVER AL VAULT" navega a `/`.
- [ x] En el Reproductor, el puntaje aumenta mientras no hay pausa; "PAUSA" lo detiene y muestra "EN PAUSA"; "REANUDAR" lo retoma.
- [x ] "FIN" abre el modal "FIN DEL JUEGO" con el puntaje final; "GUARDAR PUNTUACIÓN" muestra "PUNTUACIÓN GUARDADA\_" y no escribe en `localStorage`.
- [ x] "JUGAR DE NUEVO" reinicia puntaje, vidas y nivel; "SALIR" navega a `/juegos/[id]`.
- [ x] En Auth, la pestaña "CREAR CUENTA" muestra el campo de correo y "INICIAR SESIÓN" lo oculta.
- [x ] Enviar el formulario con usuario `px_kai` guarda `{"name":"PX_KAI"}` en `localStorage["av_user"]`, redirige a `/` y la nav muestra `PX_KAI`.
- [ x] Con el campo usuario vacío, el nombre resultante es `PLAYER1`.
- [x ] "JUGAR COMO INVITADO" redirige a `/` sin crear `av_user`.
- [x ] Cerrar sesión elimina `av_user` y la nav vuelve a mostrar "Iniciar Sesión".
- [x ] Recargar la página con sesión activa mantiene al usuario en la nav.
- [ x] El Salón muestra una pestaña por cada juego (8), un podio con 3 posiciones y una tabla de 12 filas.
- [ x] La fila "TU MEJOR MARCA" aparece solo con sesión activa.
- [ x] Con ancho ≤ 768 px aparece el botón hamburguesa y el panel móvil abre y cierra; el enlace activo se marca en nav y en el panel.
- [x ] Los puntajes del Detalle y del Salón son idénticos entre recargas (determinista).
- [x ] No existe lógica de juego real: ningún `<canvas>`, ni manejo de teclado del juego, ni colisiones.

---

## Decisions

- **Sí:** rutas reales del App Router. Dan URLs compartibles, aprovechan `cacheComponents` y el prefetch, y evitan portar un router por hash.
- **No:** SPA con hash como en el template. Ignora el framework y pierde SEO y prefetch.
- **Sí:** páginas como Server Components y solo las partes interactivas como Client Components (`LibraryClient`, `PlayerClient`, `AuthForm`, `HallClient`, `Nav`). Minimiza JS en cliente.
- **Sí:** reproductor con arena de demostración interactiva (HUD, pausa, modal), sin persistir puntajes. Permite validar todo el diseño visual sin escribir un juego.
- **No:** guardar puntajes en `localStorage` (`av_scores` del template). Nadie los lee todavía, porque el Salón usa mock; llega con el spec de puntuaciones.
- **No:** reproductor estático. No se vería el modal ni el flujo de pausa.
- **Sí:** sesión mock en `localStorage["av_user"]`, misma clave que el template. Permite ver la nav con y sin usuario sin backend.
- **No:** sesión solo visual. Dejaría sin probar el estado "con usuario" de la nav y del Salón.
- **Sí:** datos mock tipados en `lib/data.ts` con PRNG determinista. Evita hydration mismatch.
- **No:** JSON estático. No cubre la generación de puntajes y obliga a duplicar lógica después.
- **Sí:** reutilizar `app/globals.css` tal cual. Ya contiene las clases del template; los componentes usan esas clases en lugar de Tailwind.
- **Sí:** aplicar la skill `/frontend-design` al implementar, según `CLAUDE.md`. La fidelidad al template manda sobre reinterpretar el diseño.
- **Sí:** no instalar dependencias nuevas. Todo se resuelve con React, Next y CSS existente.

---

## Risks

| Riesgo                                                                                              | Mitigación                                                                                      |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Hydration mismatch al leer `localStorage` en la nav                                                 | `useSyncExternalStore` con snapshot de servidor `null`.                                         |
| `cacheComponents` rompe páginas que usan APIs dinámicas o `params` sin `Suspense`                   | Leer la guía antes del paso 1; usar `generateStaticParams` y `Suspense` donde lo pida la guía.  |
| Next 16 cambia APIs respecto al conocimiento previo (`params` asíncrono, helpers de tipos globales) | Consultar `node_modules/next/dist/docs/` antes de escribir cada ruta y usar `PageProps<"...">`. |
| Cálculo de puntaje del reproductor usa `Math.random` y rompe SSR                                    | La simulación corre solo en `useEffect`; el render inicial usa puntaje `0`.                     |
| Clases CSS del template no cubren algún estado (p. ej. foco de inputs)                              | Ajustar `globals.css` solo si falta, sin tocar tokens existentes.                               |

---

## What is **not** in this spec

- Ningún juego jugable (ni el Bloque Buster ni ningún otro).
- Backend, base de datos o autenticación real.
- Persistencia de puntajes o ranking real.
- Perfil de usuario, créditos funcionales, OAuth.
- Tests automatizados.
- Internacionalización.

Cada uno de esos puntos, si se aborda, va en su propio spec.
