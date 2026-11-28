"use client";

import { useRef, useState } from "react";
import AsteroidsCanvas from "@/components/asteroids-canvas";
import CrtFrame from "@/components/crt-frame";
import Hud from "@/components/player-hud";
import { START_LIVES } from "@/lib/asteroids/constants";
import type { AsteroidsGame, AsteroidsSnapshot } from "@/lib/asteroids/types";
import { useSession } from "@/lib/session";

// Lo que muestra el HUD hasta que el motor envía sus datos.
const INITIAL_SNAPSHOT: AsteroidsSnapshot = { score: 0, lives: START_LIVES, level: 1 };

type Props = { gameId: string; title: string };

export default function AsteroidsPlayer({ gameId, title }: Props) {
  const user = useSession();
  const gameRef = useRef<AsteroidsGame | null>(null);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);

  return (
    <div className="av-player fade-in">
      <Hud
        name={user?.name ?? "INVITADO"}
        score={snapshot.score}
        lives={snapshot.lives}
        level={snapshot.level}
        paused={false}
        gameId={gameId}
        onTogglePause={() => {}}
        onEnd={() => {}}
      />
      <CrtFrame title={title}>
        <AsteroidsCanvas gameRef={gameRef} onChange={setSnapshot} onGameOver={() => {}} />
      </CrtFrame>
    </div>
  );
}
