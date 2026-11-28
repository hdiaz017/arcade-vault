// Motor de Asteroids: estado, reglas, dibujo y bucle de una partida.
// No depende de React ni guarda estado a nivel de módulo.

import {
  ASTEROID_HITBOX,
  ASTEROID_POINTS,
  COLOR_BG,
  COLOR_POWERUP,
  H,
  LEVEL_EXTRA_ASTEROIDS,
  MAX_DT,
  PARTICLES_PER_SIZE,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEED_KILLS,
  RESPAWN_DELAY,
  SHIP_EXPLOSION_PARTICLES,
  SPAWN_SAFE_DIST,
  START_ASTEROIDS,
  START_LIVES,
  W,
} from "./constants";
import { Asteroid, Bullet, Particle, PowerUp, Ship } from "./entities";
import { createKeyboard, type KeyboardState } from "./input";
import type { AsteroidsCallbacks, AsteroidsGame, AsteroidsSnapshot } from "./types";
import { dist, rand } from "./utils";

/** `dead`: la nave explotó y aún quedan vidas; está esperando para reaparecer. */
type Phase = "playing" | "dead" | "gameover";

type GameState = {
  phase: Phase;
  score: number;
  lives: number;
  level: number;
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  powerUps: PowerUp[];
  deadTimer: number;
  // Aparece como máximo un power-up por nivel.
  powerUpSpawned: boolean;
  killsSinceSpawn: number;
};

/** Añade asteroides grandes en posiciones alejadas del centro. */
function spawnAsteroids(state: GameState, count: number) {
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SPAWN_SAFE_DIST);
    state.asteroids.push(new Asteroid(x, y, 3));
  }
}

/** Partida nueva: nivel 1, tres vidas y la primera oleada. */
function createState(): GameState {
  const state: GameState = {
    phase: "playing",
    score: 0,
    lives: START_LIVES,
    level: 1,
    ship: new Ship(),
    bullets: [],
    asteroids: [],
    particles: [],
    powerUps: [],
    deadTimer: 0,
    powerUpSpawned: false,
    killsSinceSpawn: 0,
  };
  spawnAsteroids(state, START_ASTEROIDS);
  return state;
}

function nextLevel(state: GameState) {
  state.level++;
  state.bullets = [];
  state.particles = [];
  state.powerUps = [];
  state.powerUpSpawned = false;
  state.killsSinceSpawn = 0;
  state.ship.reset();
  spawnAsteroids(state, LEVEL_EXTRA_ASTEROIDS + state.level);
}

function explode(state: GameState, x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) state.particles.push(new Particle(x, y));
}

function killShip(state: GameState) {
  explode(state, state.ship.x, state.ship.y, SHIP_EXPLOSION_PARTICLES);
  state.ship.dead = true;
  state.lives--;
  if (state.lives <= 0) {
    state.phase = "gameover";
  } else {
    state.phase = "dead";
    state.deadTimer = RESPAWN_DELAY;
  }
}

function updateParticles(state: GameState, dt: number) {
  state.particles.forEach((p) => p.update(dt));
  state.particles = state.particles.filter((p) => !p.dead);
}

function collectPowerUps({ ship, powerUps }: GameState) {
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      ship.tripleShot = POWERUP_DURATION;
    }
  }
}

/** Suelta el power-up del nivel: al azar, o seguro a la quinta destrucción. */
function maybeDropPowerUp(state: GameState, x: number, y: number) {
  if (state.powerUpSpawned) return;
  state.killsSinceSpawn++;
  const guaranteed = state.killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
  if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
    state.powerUps.push(new PowerUp(x, y));
    state.powerUpSpawned = true;
  }
}

function hitAsteroids(state: GameState) {
  const fragments: Asteroid[] = [];
  for (const b of state.bullets) {
    for (const a of state.asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        state.score += ASTEROID_POINTS[a.size];
        explode(state, a.x, a.y, a.size * PARTICLES_PER_SIZE);
        fragments.push(...a.split());
        maybeDropPowerUp(state, a.x, a.y);
      }
    }
  }
  state.asteroids = state.asteroids.filter((a) => !a.dead).concat(fragments);
  state.bullets = state.bullets.filter((b) => !b.dead);
}

function hitShip(state: GameState) {
  const { ship } = state;
  if (ship.invincible > 0) return;
  const crashed = state.asteroids.some(
    (a) => dist(ship, a) < ship.radius + a.radius * ASTEROID_HITBOX,
  );
  if (crashed) killShip(state);
}

/** Avanza la partida `dt` segundos. */
function update(state: GameState, dt: number, keys: KeyboardState) {
  // Terminada la partida solo siguen las partículas; el teclado se ignora.
  if (state.phase === "gameover") {
    updateParticles(state, dt);
    return;
  }

  if (state.phase === "dead") {
    state.deadTimer -= dt;
    updateParticles(state, dt);
    state.asteroids.forEach((a) => a.update(dt));
    if (state.deadTimer <= 0) {
      state.phase = "playing";
      state.ship.reset();
    }
    return;
  }

  if (keys.pressed("Space")) state.bullets.push(...state.ship.tryShoot());

  state.ship.update(dt, keys);
  state.bullets.forEach((b) => b.update(dt));
  state.asteroids.forEach((a) => a.update(dt));
  updateParticles(state, dt);
  state.powerUps.forEach((p) => p.update(dt));

  state.bullets = state.bullets.filter((b) => !b.dead);
  state.powerUps = state.powerUps.filter((p) => !p.dead);

  collectPowerUps(state);
  hitAsteroids(state);
  hitShip(state);

  if (state.asteroids.length === 0) nextLevel(state);
}

/** Pinta la escena. Puntaje, vidas y nivel los muestra el HUD de React. */
function draw(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, W, H);

  state.particles.forEach((p) => p.draw(ctx));
  state.asteroids.forEach((a) => a.draw(ctx));
  state.powerUps.forEach((p) => p.draw(ctx));
  state.bullets.forEach((b) => b.draw(ctx));
  state.ship.draw(ctx);

  const { tripleShot } = state.ship;
  if (tripleShot > 0) {
    ctx.fillStyle = COLOR_POWERUP;
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`3x  ${tripleShot.toFixed(1)}s`, 14, 46);
  }
}

/**
 * Crea una partida sobre `canvas` y la pone en marcha.
 * Quien la crea debe llamar a `destroy` cuando deje de usarla.
 */
export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo obtener el contexto 2D del canvas");
  const ctx: CanvasRenderingContext2D = context;

  // Resolución lógica; el tamaño en pantalla lo decide el CSS.
  canvas.width = W;
  canvas.height = H;

  let state = createState();
  let paused = false;
  let destroyed = false;
  let frame = 0;
  let lastTime: number | null = null;
  let reported: AsteroidsSnapshot | null = null;
  let gameOverReported = false;

  const keys = createKeyboard(() => !paused && state.phase !== "gameover");

  /** Avisa a quien usa el motor solo de lo que ha cambiado. */
  function notify() {
    const { score, lives, level, phase } = state;
    if (reported?.score !== score || reported.lives !== lives || reported.level !== level) {
      reported = { score, lives, level };
      callbacks.onChange(reported);
    }
    if (phase === "gameover" && !gameOverReported) {
      gameOverReported = true;
      callbacks.onGameOver(score);
    }
  }

  function loop(time: number) {
    // Se pide antes de avisar: así `destroy` desde un callback detiene el bucle.
    frame = requestAnimationFrame(loop);
    const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT);
    lastTime = time;
    update(state, dt, keys);
    draw(ctx, state);
    notify();
  }

  function stop() {
    cancelAnimationFrame(frame);
  }

  function start() {
    stop();
    lastTime = null; // el tiempo detenido no cuenta
    frame = requestAnimationFrame(loop);
  }

  function setPaused(value: boolean) {
    if (destroyed || value === paused) return;
    // Terminada la partida no hay nada que pausar: las partículas siguen.
    if (value && state.phase === "gameover") return;
    paused = value;
    keys.clear();
    if (paused) stop();
    else start();
  }

  function end() {
    if (destroyed || state.phase === "gameover") return;
    state.phase = "gameover";
    state.ship.thrusting = false;
    setPaused(false);
    notify();
  }

  function restart() {
    if (destroyed) return;
    state = createState();
    paused = false;
    reported = null;
    gameOverReported = false;
    keys.clear();
    draw(ctx, state);
    start();
    notify();
  }

  function destroy() {
    destroyed = true;
    stop();
    keys.destroy();
  }

  draw(ctx, state);
  start();
  notify();

  return { setPaused, end, restart, destroy };
}
