type Point = { x: number; y: number };

/** Devuelve `v` dentro de [0, max): lo que sale por un borde entra por el opuesto. */
export const wrap = (v: number, max: number) => ((v % max) + max) % max;

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Entero aleatorio entre `min` y `max`, ambos incluidos. */
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
