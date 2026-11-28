// Los mismos límites que las restricciones de la tabla `scores`.
export const NAME_MAX = 10;
export const SCORE_MAX = 10_000_000;

export function canSaveScore(name: string, score: number): boolean {
  const { length } = name.trim();
  return (
    length >= 1 &&
    length <= NAME_MAX &&
    Number.isInteger(score) &&
    score > 0 &&
    score <= SCORE_MAX
  );
}
