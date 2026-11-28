import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import HallClient from "@/components/hall-client";
import { listGames, listTopScores } from "@/lib/scores/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Salón de la Fama" };

const LIMIT = 12;

function LoadError() {
  return (
    <p className="scores-status error" role="alert">
      NO SE PUDIERON CARGAR LAS PUNTUACIONES
    </p>
  );
}

// Usa cookies() a través del cliente: debe ir dentro de <Suspense>.
async function HallData() {
  const supabase = await createClient();
  const games = await listGames(supabase);
  if (!games.ok) return <LoadError />;

  const boards = await Promise.all(
    games.data.map(async (game) => ({
      ...game,
      top: await listTopScores(supabase, game.id, LIMIT),
    })),
  );
  const loaded = boards.flatMap(({ id, title, top }) =>
    top.ok ? [{ id, title, rows: top.data }] : [],
  );
  if (loaded.length < boards.length) return <LoadError />;

  return <HallClient boards={loaded} />;
}

export default function HallPage() {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <Suspense
        fallback={
          <p className="scores-status" role="status">
            CARGANDO PUNTUACIONES…
          </p>
        }
      >
        <HallData />
      </Suspense>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
