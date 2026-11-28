# SPEC 05 — Juego Asteroids jugable en el reproductor

> **Status:** approved
> **Depends on:** SPEC 01
> **Date:** 2026-11-27
> **Objective:** Añadir ASTEROIDS como noveno juego del catálogo y hacerlo jugable en `/juegos/asteroids/jugar`, portando `references/started-games/02-asteroids/game.js` a un motor TypeScript integrado con el HUD y el modal de React.

---

## Por qué existe este spec

El reproductor del SPEC 01 es una demostración: el puntaje se simula y no hay juego. Este es el primer juego real de la plataforma, así que fija el patrón para los siguientes: un motor sin dependencias de React en `lib/`, un componente cliente que monta el canvas y el HUD de React alimentado por el motor.

El original es JavaScript global sobre un canvas fijo de 800×600. No se puede copiar tal cual: necesita crearse y destruirse limpiamente, y con `cacheComponents` Next oculta las páginas con `<Activity>` en vez de desmontarlas, lo que ejecuta y relanza los efectos.

---

## Scope

**In:**

- Entrada nueva `asteroids` / `ASTEROIDS` (categoría `SHOOTER`) al final de `GAMES`.
- Portada CSS `.cover-asteroids` en el estilo vectorial blanco sobre negro del juego.
- Port completo de la jugabilidad de `game.js`: nave, balas, asteroides que se parten, partículas, niveles, 3 vidas, invencibilidad con parpadeo al reaparecer y power-up de triple disparo.
- Los mismos valores numéricos del original (velocidades, radios, puntos, tiempos y probabilidades).
- Aspecto original: vector blanco, llama naranja y power-up cyan.
- Canvas con resolución lógica 800×600 escalado al `.crt-screen` (4:3).
- HUD de React (`Jugador`, `Puntuación`, `Vidas`, `Nivel`) alimentado por el motor.
- Contador del triple disparo (`3x  N.Ns`) dibujado dentro del canvas.
- Modal "FIN DEL JUEGO" al perder la última vida o al pulsar "FIN".
- "GUARDAR PUNTUACIÓN" muestra el aviso actual sin guardar nada.
- Pausa con el botón, con la tecla `P` y automática al ocultar la pestaña o perder el foco la ventana.
- Aviso de "se necesita teclado" en dispositivos táctiles.
- En el Detalle de `asteroids`, la etiqueta de controles dice `TECLADO`.

**Out of scope (para futuros specs):**

- Persistencia de puntajes (`localStorage` o Supabase) y ranking real.
- Controles táctiles y gamepad.
- Sonido y música.
- OVNIs, hiperespacio u otra mecánica que no esté en `game.js`.
- Paleta neón u otro rediseño visual del juego.
- Cualquier cambio en el juego `rocas` o en la demo de los otros juegos.
- Una abstracción común o registro de motores para varios juegos.
- Tetris y Arkanoid.
- Tests automatizados.

---

## Data model

Entrada nueva en `lib/games.ts` (usa el tipo `Game` sin cambios):

```ts
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Parte las rocas y sobrevive al campo de asteroides.",
  long: "Tu nave deriva en un espacio sin bordes: lo que sale por un lado vuelve por el otro. Parte cada asteroide en fragmentos más pequeños, atrapa el triple disparo y aguanta nivel tras nivel con solo tres vidas.",
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "cyan",
  best: 32500,
  plays: "1.2K",
}
```

Contrato entre el motor y React:

```ts
// lib/asteroids/types.ts
export type AsteroidsSnapshot = {
   score: number;
   lives: number; // 3 → 0
   level: number; // empieza en 1
};

export type AsteroidsCallbacks = {
   onChange: (snapshot: AsteroidsSnapshot) => void;
   onGameOver: (finalScore: number) => void;
};

export type AsteroidsGame = {
   setPaused: (paused: boolean) => void;
   end: () => void; // termina la partida (botón FIN)
   restart: () => void;
   destroy: () => void; // cancela el frame y quita los listeners
};

// lib/asteroids/engine.ts
export function createAsteroidsGame(
   canvas: HTMLCanvasElement,
   callbacks: AsteroidsCallbacks,
): AsteroidsGame;
```

Estructura de archivos:

| Archivo                           | Contenido                                                   |
| --------------------------------- | ----------------------------------------------------------- |
| `lib/asteroids/types.ts`          | Tipos del contrato                                          |
| `lib/asteroids/constants.ts`      | `W`, `H`, radios, velocidades, puntos y valores de power-up |
| `lib/asteroids/utils.ts`          | `wrap`, `dist`, `rand`, `randInt`                           |
| `lib/asteroids/entities.ts`       | `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`         |
| `lib/asteroids/input.ts`          | Teclado: teclas mantenidas, pulsaciones y limpieza          |
| `lib/asteroids/engine.ts`         | Estado, `update`, `draw`, bucle y `createAsteroidsGame`     |
| `components/player-hud.tsx`       | `Hud`, extraído de `player-client.tsx`                      |
| `components/crt-frame.tsx`        | Marco CRT con `children` y barra inferior                   |
| `components/game-over-modal.tsx`  | `GameOverModal`, extraído de `player-client.tsx`            |
| `components/asteroids-canvas.tsx` | Cliente: monta el canvas, crea y destruye el motor          |
| `components/asteroids-player.tsx` | Cliente: estado de HUD, pausa, FIN, modal y aviso táctil    |

Convenciones:

- El motor no importa React ni Next y no tiene estado mutable a nivel de módulo.
- Las entidades reciben el `CanvasRenderingContext2D` y el estado de teclado por parámetro, no por variables globales.
- `onChange` se llama al crear la partida y al reiniciar, y después solo cuando cambia `score`, `lives` o `level`.
- `onGameOver` se llama una sola vez por partida.
- `end()` deja la partida en `gameover` y llama a `onGameOver` con el puntaje actual; las vidas no se modifican.
- Tras `gameover` el motor sigue animando las partículas e ignora el teclado; `Espacio` ya no reinicia.
- El delta de tiempo se limita a 0,05 s, y al reanudar de una pausa no se acumula el tiempo transcurrido.
- Teclas: `ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space` y `KeyP` (por `event.code`).
- El motor llama a `preventDefault()` en flechas (incluida `ArrowDown`) y `Espacio` solo con la partida en curso y sin pausa.
- El motor ignora las teclas cuyo destino es un `input` o `textarea`.
- Al pausar o perder el foco se vacían las teclas mantenidas.
- Dispositivo táctil: `matchMedia("(hover: none) and (pointer: coarse)")`.
- Texto del aviso táctil: "ESTE JUEGO NECESITA TECLADO".
- Texto bajo "EN PAUSA": "PULSA REANUDAR O LA TECLA P".

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/01-app` las guías de Client Components y `02-guides/preserving-ui-state.md`, tal como exige `AGENTS.md`. Aplicar `/frontend-design` según `CLAUDE.md`, con fidelidad al juego original por encima de reinterpretar.

1. **Catálogo.** Añadir la entrada a `lib/games.ts`, `.cover-asteroids` a `app/globals.css` y la etiqueta `TECLADO` en `app/juegos/[id]/page.tsx`. Verificación: la Biblioteca muestra 9 juegos y `/juegos/asteroids/jugar` carga la demo actual.
2. **Base del motor.** Crear `lib/asteroids/types.ts`, `constants.ts` y `utils.ts`. Verificación: `pnpm exec tsc --noEmit` pasa.
3. **Teclado.** Crear `lib/asteroids/input.ts`. Verificación: `tsc` y `pnpm run lint` pasan.
4. **Proyectiles y rocas.** Crear `lib/asteroids/entities.ts` con `Bullet`, `Asteroid` y `Particle`. Verificación: `tsc` pasa.
5. **Nave y power-up.** Añadir `Ship` y `PowerUp` a `entities.ts`. Verificación: `tsc` pasa.
6. **Estado y reglas.** Crear `lib/asteroids/engine.ts` con inicio de partida, niveles, colisiones, muerte y reaparición. Verificación: `tsc` pasa.
7. **Dibujo, bucle y API.** Completar `engine.ts` con `draw`, el bucle y `createAsteroidsGame`. Verificación: `tsc` y `lint` pasan.
8. **Piezas del reproductor.** Extraer `Hud`, marco CRT y `GameOverModal` a sus archivos y hacer que `player-client.tsx` los use. Verificación: la demo de `/juegos/rocas/jugar` funciona igual que antes.
9. **Juego conectado.** Crear `components/asteroids-canvas.tsx` y `components/asteroids-player.tsx`, y hacer que `app/juegos/[id]/jugar/page.tsx` renderice `AsteroidsPlayer` cuando `id` es `asteroids`. Verificación: se puede jugar y el HUD refleja puntaje, vidas y nivel.
10.   **Pausa y fin.** Conectar PAUSA, tecla `P`, pausa automática, FIN, modal y "JUGAR DE NUEVO". Verificación: cada control hace lo descrito en los criterios.
11.   **Táctil y ciclo de vida.** Mostrar el aviso táctil sin crear el motor, y reiniciar pausa, modal y aviso de guardado cada vez que se crea el motor. Verificación: salir y volver a la ruta empieza una partida limpia; `pnpm run build` y `pnpm run lint` pasan.

---

## Acceptance criteria

**Catálogo**

- [ ] `pnpm run build`, `pnpm run lint` y `pnpm exec tsc --noEmit` terminan sin errores.
- [ ] La Biblioteca muestra 9 tarjetas y `ASTEROIDS` aparece al filtrar por "SHOOTER".
- [ ] El Salón de la Fama tiene una pestaña `ASTEROIDS`.
- [ ] El Home sigue mostrando los mismos 6 juegos que antes.
- [ ] `/juegos/asteroids` muestra la ficha con la etiqueta `TECLADO`; los otros juegos conservan `TECLADO / TÁCTIL`.

**Jugabilidad**

- [ ] `/juegos/asteroids/jugar` muestra un canvas con 4 asteroides grandes, la nave en el centro y parpadeando.
- [ ] `←` y `→` rotan, `↑` propulsa con llama naranja y `Espacio` dispara.
- [ ] La nave, las balas y los asteroides que salen por un borde reaparecen por el opuesto.
- [ ] Un asteroide grande suma 20 puntos, uno mediano 50 y uno pequeño 100.
- [ ] Un asteroide grande o mediano se parte en 2 del tamaño inferior; uno pequeño desaparece.
- [ ] Como máximo aparece un power-up `3x` por nivel, y siempre aparece a la quinta destrucción si no salió antes.
- [ ] Al recogerlo, cada disparo lanza 3 balas durante 5 segundos y el canvas muestra el tiempo restante.
- [ ] Al chocar, se resta una vida y la nave reaparece a los 2 segundos con invencibilidad.
- [ ] Al destruir todos los asteroides sube el nivel y aparecen `3 + nivel` asteroides grandes.

**Reproductor**

- [ ] El HUD de React muestra los mismos puntaje, vidas y nivel que la partida.
- [ ] El canvas no dibuja puntaje, nivel, vidas ni "GAME OVER".
- [ ] El puntaje no sube solo: sin destruir asteroides se mantiene en 0.
- [ ] El botón "PAUSA" y la tecla `P` congelan el juego y muestran "EN PAUSA"; ambos lo reanudan.
- [ ] Cambiar de pestaña o de ventana deja el juego en pausa.
- [ ] Al reanudar, ningún objeto salta de posición y la nave no queda propulsando sola.
- [ ] Perder la tercera vida abre "FIN DEL JUEGO" con el puntaje final y muestra las vidas como `—`.
- [ ] "FIN" abre el mismo modal con el puntaje actual y detiene la partida.
- [ ] En el modal se pueden escribir iniciales, incluidos espacios y la letra `P`, sin disparar ni pausar.
- [ ] "GUARDAR PUNTUACIÓN" muestra "PUNTUACIÓN GUARDADA\_" y no escribe en `localStorage` ni hace peticiones de red.
- [ ] "JUGAR DE NUEVO" reinicia con puntaje 0, 3 vidas y nivel 1.
- [ ] Pulsar flechas o `Espacio` durante la partida no desplaza la página.
- [ ] Tras pulsar un botón del HUD, `Espacio` dispara y no vuelve a activar ese botón.

**Integración**

- [ ] El canvas ocupa el `.crt-screen` sin deformarse con anchos de ventana de 1280 px y 700 px.
- [ ] En un dispositivo táctil emulado se muestra "ESTE JUEGO NECESITA TECLADO" y no corre la partida.
- [ ] Tras salir de la ruta, las flechas y `Espacio` vuelven a desplazar las demás páginas.
- [ ] Volver a la ruta empieza una partida limpia, a velocidad normal y sin modal abierto.
- [ ] `/juegos/rocas/jugar` sigue mostrando la demo con puntaje simulado.
- [ ] La consola no muestra errores ni warnings de hydration.
- [ ] `package.json` no suma dependencias.
- [ ] `references/` no tiene cambios hechos por este spec.

---

## Decisions

- **Sí:** entrada nueva `asteroids`. Decisión del usuario: `rocas` queda como demo.
- **No:** reemplazar o renombrar `rocas`.
- **Sí:** colocarla al final de `GAMES`. No altera los destacados del Home ni la pestaña inicial del Salón.
- **Sí:** HUD y modal de React. Mantiene una sola interfaz para todos los juegos y evita datos duplicados.
- **No:** HUD y "GAME OVER" del canvas original.
- **Sí:** el contador del triple disparo sigue en el canvas. El HUD común no tiene ese dato.
- **No:** persistir puntajes. Va en un spec propio con Supabase.
- **Sí:** solo teclado, con aviso en táctil. Los controles táctiles son otro spec.
- **Sí:** aspecto original en blanco y negro. Decisión del usuario por fidelidad.
- **No:** paleta neón del tema.
- **Sí:** botones más tecla `P` y pausa automática. Evita perder vidas sin estar mirando.
- **Sí:** motor TypeScript en `lib/asteroids/`. Permite limpieza correcta y comunicación directa con React.
- **No:** `iframe` en `public/` con `postMessage`. Integración más frágil.
- **No:** dibujar con componentes de React. Redibujar cada frame por estado no aporta nada sobre el canvas.
- **Sí:** componente `AsteroidsPlayer` separado de `PlayerClient`, compartiendo HUD, CRT y modal. La demo no se llena de condicionales.
- **Sí:** condición directa `id === "asteroids"` en la página. Un registro de motores se justificará con el segundo juego.
- **Sí:** al salir de la ruta la partida se descarta. Es más simple que conservar el motor oculto por `<Activity>`.
- **Sí:** `FIN` y la última vida desembocan en el mismo flujo. Un solo camino de fin de partida.

---

## Risks

| Riesgo                                                                                         | Mitigación                                                                                                      |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Efectos que se ejecutan dos veces (Strict Mode) o se relanzan (`<Activity>`) y duplican bucles | `destroy()` cancela el frame y quita todos los listeners; el efecto de `asteroids-canvas.tsx` siempre lo llama. |
| `<Activity>` conserva `paused`, `over` y `saved` de la partida anterior                        | El paso 11 los reinicia al crear el motor.                                                                      |
| Callbacks que cambian en cada render recrean el motor y reinician la partida                   | El componente guarda los callbacks en una ref y crea el motor una sola vez por montaje.                         |
| `Espacio` activa el botón del HUD que conserva el foco                                         | `preventDefault()` durante la partida y quitar el foco del botón tras pulsarlo.                                 |
| El escalado del canvas se ve borroso en pantallas de alta densidad                             | Aceptado: se mantiene la resolución lógica 800×600 como el original.                                            |
| Las capas `::before` y `::after` del CRT oscurecen las líneas finas                            | Ajustar solo en `.crt-screen` del juego si no se distinguen los objetos, sin cambiar la demo.                   |
| El `best` y el leaderboard del Detalle son mock y no coinciden con los puntajes reales         | Aceptado hasta el spec de puntuaciones.                                                                         |

---

## What is **not** in this spec

- Puntajes persistidos o ranking real.
- Controles táctiles o gamepad.
- Sonido.
- Mecánicas nuevas o rediseño visual del juego.
- Cambios a `rocas` o a los demás juegos.
- Tetris y Arkanoid.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
