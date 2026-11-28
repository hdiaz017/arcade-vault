import { GAMES } from "./games";
import type { Game } from "./types";

export { GAMES };

export const CATS: readonly string[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];

export function getGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id);
}
