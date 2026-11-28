import { listTopScores } from "@/lib/scores/queries";
import { createClient } from "@/lib/supabase/server";

const LIMIT = 10;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {children}
    </div>
  );
}

export function LeaderboardFallback() {
  return (
    <Frame>
      <p className="scores-status" role="status">
        CARGANDO PUNTUACIONES…
      </p>
    </Frame>
  );
}

// Usa cookies() a través del cliente: debe ir dentro de <Suspense>.
export default async function Leaderboard({ gameId }: { gameId: string }) {
  const supabase = await createClient();
  const result = await listTopScores(supabase, gameId, LIMIT);

  if (!result.ok) {
    return (
      <Frame>
        <p className="scores-status error" role="alert">
          NO SE PUDIERON CARGAR LAS PUNTUACIONES
        </p>
      </Frame>
    );
  }

  return (
    <Frame>
      {result.data.length === 0 && (
        <p className="scores-status">AÚN NO HAY PUNTUACIONES</p>
      )}
      {result.data.map((r, i) => (
        <div
          key={r.rank}
          className={
            "lb-row" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
          }
        >
          <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
          <div className="pl">
            {r.name}
            <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>
              {r.date}
            </div>
          </div>
          <div className="sc">{r.score.toLocaleString("es-ES")}</div>
        </div>
      ))}
    </Frame>
  );
}
