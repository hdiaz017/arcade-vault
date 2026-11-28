// Valores de jugabilidad copiados de references/started-games/02-asteroids/game.js.
// Unidades: px, segundos y radianes sobre un lienzo lógico de W × H.

export const W = 800;
export const H = 600;
export const MAX_DT = 0.05;

// Partida
export const START_LIVES = 3;
export const START_ASTEROIDS = 4;
export const LEVEL_EXTRA_ASTEROIDS = 3; // cada nivel nuevo: 3 + nivel
export const SPAWN_SAFE_DIST = 130; // distancia mínima al centro al aparecer
export const RESPAWN_DELAY = 2;

// Nave
export const SHIP_RADIUS = 12;
export const SHIP_ROTATION_SPEED = 3.5; // rad/s
export const SHIP_THRUST = 260; // px/s²
export const SHIP_DRAG = 0.987; // se aplica una vez por frame
export const SHIP_NOSE = 21; // distancia del centro al origen de la bala
export const SHIP_INVINCIBLE_TIME = 3;
export const SHOOT_COOLDOWN = 0.2;

// Balas
export const BULLET_SPEED = 520;
export const BULLET_TTL = 1.1;
export const BULLET_RADIUS = 2;

// Asteroides: tamaño 1 (pequeño), 2 (mediano) y 3 (grande)
export type AsteroidSize = 1 | 2 | 3;

export const ASTEROID_RADII: Record<AsteroidSize, number> = { 1: 16, 2: 30, 3: 50 };
export const ASTEROID_SPEEDS: Record<AsteroidSize, number> = { 1: 85, 2: 55, 3: 32 };
export const ASTEROID_POINTS: Record<AsteroidSize, number> = { 1: 100, 2: 50, 3: 20 };
export const ASTEROID_SPEED_JITTER = 15;
export const ASTEROID_MAX_ROTATION = 1.2; // rad/s, en ambos sentidos
export const ASTEROID_MIN_VERTICES = 8;
export const ASTEROID_MAX_VERTICES = 13;
export const ASTEROID_MIN_VERTEX_RADIUS = 0.6; // fracción del radio
export const ASTEROID_HITBOX = 0.82; // fracción del radio que choca con la nave

// Partículas
export const PARTICLE_MIN_SPEED = 30;
export const PARTICLE_MAX_SPEED = 130;
export const PARTICLE_MIN_LIFE = 0.4;
export const PARTICLE_MAX_LIFE = 1.1;
export const PARTICLES_PER_SIZE = 5; // al destruir un asteroide: tamaño × 5
export const SHIP_EXPLOSION_PARTICLES = 14;

// Power-up de triple disparo
export const POWERUP_RADIUS = 12;
export const POWERUP_MIN_SPEED = 20;
export const POWERUP_MAX_SPEED = 40;
export const POWERUP_TTL = 12;
export const POWERUP_DURATION = 5;
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_GUARANTEED_KILLS = 5;
export const TRIPLE_SPREAD = 0.18;

// Colores del original
export const COLOR_BG = "#000";
export const COLOR_LINE = "#fff";
export const COLOR_FLAME = "rgba(255, 130, 0, 0.85)";
export const COLOR_POWERUP = "#0ff";
