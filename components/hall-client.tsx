"use client";

import { useState } from "react";
import type { ScoreRow } from "@/lib/types";

const fmt = (n: number) => n.toLocaleString("es-ES");
const pad = (n: number) => String(n).padStart(2, "0");

const EMPTY = "---";

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

export default function HallClient({ boards }: { boards: HallBoard[] }) {
  const [tab, setTab] = useState(boards[0]?.id);
  const board = boards.find((b) => b.id === tab) ?? boards[0];
  const rows = board?.rows ?? [];

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
      </div>
    </>
  );
}
