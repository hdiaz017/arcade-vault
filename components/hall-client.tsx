"use client";

import { useEffect, useState } from "react";
import { getBestMark, type BestMark } from "@/lib/scores/queries";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import type { ScoreRow } from "@/lib/types";

const fmt = (n: number) => n.toLocaleString("es-ES");
const pad = (n: number) => String(n).padStart(2, "0");

const EMPTY = "---";
const YELLOW = { color: "var(--yellow)" };

// Orden en pantalla: plata, oro y bronce.
const PODIUM = [
  { place: 2, tone: "silver" },
  { place: 1, tone: "gold" },
  { place: 3, tone: "bronze" },
];

export type HallBoard = { id: string; title: string; rows: ScoreRow[] };

function Podium({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="podium">
      {PODIUM.map(({ place, tone }) => {
        const row = rows[place - 1];
        const gold = place === 1;
        return (
          <div key={place} className={"podium-slot " + tone}>
            {gold && (
              <div
                className="pixel"
                style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
              >
                CAMPEÓN
              </div>
            )}
            <div
              className="rank-num"
              style={gold ? { fontSize: 36, marginTop: 4 } : undefined}
            >
              {pad(place)}
            </div>
            <div className="name">{row?.name ?? EMPTY}</div>
            <div className="score" style={gold ? { fontSize: 20 } : undefined}>
              {row ? fmt(row.score) : EMPTY}
            </div>
            <div className="date">{row?.date ?? EMPTY}</div>
          </div>
        );
      })}
    </div>
  );
}

// La sesión vive en el navegador, así que esta consulta se hace desde aquí.
// `board` cambia cuando llegan datos nuevos del servidor y obliga a repetirla.
function useBestMark(board: HallBoard | undefined): BestMark | null {
  const name = useSession()?.name;
  const [found, setFound] = useState<{
    gameId: string;
    name: string;
    mark: BestMark | null;
  } | null>(null);

  useEffect(() => {
    if (!board || !name) return;
    let current = true;
    getBestMark(createClient(), board.id, name).then((result) => {
      // Si falla, la fila se oculta.
      const mark = result.ok ? result.data : null;
      if (current) setFound({ gameId: board.id, name, mark });
    });
    return () => {
      current = false;
    };
  }, [board, name]);

  // No mostrar la marca de otra pestaña o de otra sesión mientras llega la nueva.
  return found && found.gameId === board?.id && found.name === name ? found.mark : null;
}

export default function HallClient({ boards }: { boards: HallBoard[] }) {
  const [tab, setTab] = useState(boards[0]?.id);
  const board = boards.find((b) => b.id === tab) ?? boards[0];
  const rows = board?.rows ?? [];
  const best = useBestMark(board);

  return (
    <>
      <div className="hall-tabs">
        {boards.map((b) => (
          <button
            key={b.id}
            type="button"
            className={"chip" + (b.id === board.id ? " active" : "")}
            onClick={() => setTab(b.id)}
          >
            {b.title}
          </button>
        ))}
      </div>

      <Podium rows={rows} />

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.length === 0 && (
          <p className="scores-status">AÚN NO HAY PUNTUACIONES</p>
        )}
        {rows.map((r, i) => (
          <div
            key={`${board.id}-${r.rank}`}
            className={
              "tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{pad(r.rank)}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{fmt(r.score)}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {best && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {board.title}</div>
            <div
              className="tr you"
              style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
            >
              <div className="rk" style={YELLOW}>#{pad(best.rank)}</div>
              <div className="pl" style={YELLOW}>{best.name}</div>
              <div
                className="sc"
                style={{ ...YELLOW, textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
              >
                {fmt(best.score)}
              </div>
              <div className="dt">{best.date}</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
