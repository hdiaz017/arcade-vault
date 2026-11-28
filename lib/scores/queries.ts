import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ScoreRow } from "@/lib/types";
import { NAME_MAX } from "./rules";

// Las funciones reciben el cliente, así sirven en servidor y navegador. Ninguna
// lanza por un fallo de consulta: supabase-js lo devuelve en `error`, también al
// vencer el tiempo límite.

type Client = SupabaseClient<Database>;

export type QueryResult<T> = { ok: true; data: T } | { ok: false };

export type BestMark = ScoreRow; // `rank` es la posición real en el ranking del juego

const TIMEOUT_MS = 10_000;
const timeout = () => AbortSignal.timeout(TIMEOUT_MS);

const SCORE_COLUMNS = "player_name, score, created_at";

type StoredScore = Pick<
  Database["public"]["Tables"]["scores"]["Row"],
  "player_name" | "score" | "created_at"
>;

const pad = (n: number) => String(n).padStart(2, "0");

// En UTC para que servidor y navegador muestren la misma fecha.
function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

function toScoreRow(row: StoredScore, rank: number): ScoreRow {
  return {
    rank,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  };
}

// Pasar a mayúsculas puede alargar el texto y recortarlo puede dejar un espacio al final.
const normalizeName = (name: string) =>
  name.trim().toUpperCase().slice(0, NAME_MAX).trim();

export async function listGames(
  client: Client,
): Promise<QueryResult<{ id: string; title: string }[]>> {
  const { data, error } = await client
    .from("games")
    .select("id, title")
    .order("created_at")
    .order("id")
    .abortSignal(timeout());
  return error ? { ok: false } : { ok: true, data };
}

export async function listTopScores(
  client: Client,
  gameId: string,
  limit: number,
): Promise<QueryResult<ScoreRow[]>> {
  const { data, error } = await client
    .from("scores")
    .select(SCORE_COLUMNS)
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true }) // en empate gana la más antigua
    .limit(limit)
    .abortSignal(timeout());
  if (error) return { ok: false };
  return { ok: true, data: data.map((row, i) => toScoreRow(row, i + 1)) };
}

export async function getBestMark(
  client: Client,
  gameId: string,
  name: string,
): Promise<QueryResult<BestMark | null>> {
  const signal = timeout(); // un solo límite para las dos consultas
  const best = await client
    .from("scores")
    .select(SCORE_COLUMNS)
    .eq("game_id", gameId)
    .eq("player_name", normalizeName(name))
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .abortSignal(signal);
  if (best.error) return { ok: false };

  const row = best.data[0];
  if (!row) return { ok: true, data: null };

  // Cuántas puntuaciones van por delante según el orden del ranking.
  const ahead = await client
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId)
    .or(
      `score.gt.${row.score},and(score.eq.${row.score},created_at.lt."${row.created_at}")`,
    )
    .abortSignal(signal);
  if (ahead.error || ahead.count === null) return { ok: false };

  return { ok: true, data: toScoreRow(row, ahead.count + 1) };
}

export async function saveScore(
  client: Client,
  input: { gameId: string; name: string; score: number },
): Promise<QueryResult<null>> {
  // Nunca se envían `id` ni `created_at`: los pone la base.
  const { error } = await client
    .from("scores")
    .insert({
      game_id: input.gameId,
      player_name: normalizeName(input.name),
      score: input.score,
    })
    .abortSignal(timeout());
  return error ? { ok: false } : { ok: true, data: null };
}
