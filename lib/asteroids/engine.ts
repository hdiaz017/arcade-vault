// Estado y reglas de una partida de Asteroids.

import {
  ASTEROID_HITBOX,
  ASTEROID_POINTS,
  H,
  LEVEL_EXTRA_ASTEROIDS,
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
import type { KeyboardState } from "./input";
import { dist, rand } from "./utils";

/** `dead`: la nave explotó y aún quedan vidas; está esperando para reaparecer. */
type Phase = "playing" | "dead" | "gameover";

export type GameState = {
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
export function createState(): GameState {
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
export function update(state: GameState, dt: number, keys: KeyboardState) {
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
