export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

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
