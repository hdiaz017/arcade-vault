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
  COLOR_FLAME,
  COLOR_LINE,
  COLOR_POWERUP,
  H,
  PARTICLE_MAX_LIFE,
  PARTICLE_MAX_SPEED,
  PARTICLE_MIN_LIFE,
  PARTICLE_MIN_SPEED,
  POWERUP_MAX_SPEED,
  POWERUP_MIN_SPEED,
  POWERUP_RADIUS,
  POWERUP_TTL,
  SHIP_DRAG,
  SHIP_INVINCIBLE_TIME,
  SHIP_NOSE,
  SHIP_RADIUS,
  SHIP_ROTATION_SPEED,
  SHIP_THRUST,
  SHOOT_COOLDOWN,
  TRIPLE_SPREAD,
  W,
  type AsteroidSize,
} from "./constants";
import type { KeyboardState } from "./input";
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

/** Rombo que concede el triple disparo al recogerlo. */
export class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = POWERUP_RADIUS;
  ttl = POWERUP_TTL;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(POWERUP_MIN_SPEED, POWERUP_MAX_SPEED);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Parpadea en sus últimos 2 segundos.
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    const r = this.radius * pulse;

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = COLOR_POWERUP;
    ctx.lineWidth = 2;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    ctx.fillStyle = COLOR_POWERUP;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", 0, 0);

    ctx.restore();
  }
}

export class Ship {
  x!: number;
  y!: number;
  vx!: number;
  vy!: number;
  angle!: number;
  thrusting!: boolean;
  invincible!: number;
  shootCooldown!: number;
  dead!: boolean;
  radius = SHIP_RADIUS;
  /** Segundos de triple disparo restantes. `reset` lo conserva. */
  tripleShot = 0;

  constructor() {
    this.reset();
  }

  /** Vuelve al centro, quieta, mirando arriba e invencible. */
  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.thrusting = false;
    this.invincible = SHIP_INVINCIBLE_TIME;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, keys: KeyboardState) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    if (keys.isDown("ArrowLeft")) this.angle -= SHIP_ROTATION_SPEED * dt;
    if (keys.isDown("ArrowRight")) this.angle += SHIP_ROTATION_SPEED * dt;

    this.thrusting = keys.isDown("ArrowUp");
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * SHIP_THRUST * dt;
      this.vy += Math.sin(this.angle) * SHIP_THRUST * dt;
    }

    this.vx *= SHIP_DRAG;
    this.vy *= SHIP_DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  /** Balas del disparo: ninguna si aún está recargando, una o tres. */
  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = SHOOT_COOLDOWN;
    const ox = this.x + Math.cos(this.angle) * SHIP_NOSE;
    const oy = this.y + Math.sin(this.angle) * SHIP_NOSE;
    const spread = this.tripleShot > 0 ? [-TRIPLE_SPREAD, 0, TRIPLE_SPREAD] : [0];
    return spread.map((offset) => new Bullet(ox, oy, this.angle + offset));
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    // Parpadeo durante la invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = COLOR_LINE;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor, intermitente
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = COLOR_FLAME;
      ctx.stroke();
    }

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
