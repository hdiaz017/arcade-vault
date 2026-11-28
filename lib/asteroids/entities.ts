// Objetos del juego. Cada uno se actualiza con el tiempo transcurrido (`dt`, en
// segundos) y se dibuja en el contexto que recibe.

import {
  ASTEROID_MAX_ROTATION,
  ASTEROID_MAX_VERTICES,
  ASTEROID_MIN_VERTEX_RADIUS,
  ASTEROID_MIN_VERTICES,
  ASTEROID_RADII,
  ASTEROID_SPEEDS,
  ASTEROID_SPEED_JITTER,
  BULLET_RADIUS,
  BULLET_SPEED,
  BULLET_TTL,
  COLOR_LINE,
  H,
  PARTICLE_MAX_LIFE,
  PARTICLE_MAX_SPEED,
  PARTICLE_MIN_LIFE,
  PARTICLE_MIN_SPEED,
  W,
  type AsteroidSize,
} from "./constants";
import { rand, randInt, wrap } from "./utils";

export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = BULLET_TTL;
  radius = BULLET_RADIUS;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * BULLET_SPEED;
    this.vy = Math.sin(angle) * BULLET_SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLOR_LINE;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Asteroid {
  x: number;
  y: number;
  size: AsteroidSize;
  radius: number;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][];
  dead = false;

  constructor(x: number, y: number, size: AsteroidSize = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = ASTEROID_RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed = ASTEROID_SPEEDS[size] + rand(-ASTEROID_SPEED_JITTER, ASTEROID_SPEED_JITTER);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-ASTEROID_MAX_ROTATION, ASTEROID_MAX_ROTATION);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(ASTEROID_MIN_VERTICES, ASTEROID_MAX_VERTICES);
    this.verts = Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(ASTEROID_MIN_VERTEX_RADIUS, 1);
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  /** Fragmentos que deja al destruirse: dos del tamaño inferior, o ninguno. */
  split(): Asteroid[] {
    if (this.size === 1) return [];
    const size: AsteroidSize = this.size === 3 ? 2 : 1;
    return [new Asteroid(this.x, this.y, size), new Asteroid(this.x, this.y, size)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = COLOR_LINE;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    this.verts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

/** Chispa de una explosión. No reaparece por el borde opuesto. */
export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(PARTICLE_MIN_SPEED, PARTICLE_MAX_SPEED);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(PARTICLE_MIN_LIFE, PARTICLE_MAX_LIFE);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Se desvanece según el tiempo que le queda.
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}
