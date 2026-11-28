"use client";

import { useEffect, useState } from "react";
import CrtFrame, { CrtPause } from "@/components/crt-frame";
import GameOverModal from "@/components/game-over-modal";
import Hud from "@/components/player-hud";
import { useSession } from "@/lib/session";

const INITIAL_LIVES = 3;
const POINTS_PER_LEVEL = 2500;

type Props = { gameId: string; title: string };

export default function PlayerClient({ gameId, title }: Props) {
  const user = useSession();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const name = nameEdit ?? user?.name ?? "INVITADO";
  const level = 1 + Math.floor(score / POINTS_PER_LEVEL);

  // Simulación de puntaje: solo en cliente (Math.random fuera del render).
  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [over, paused]);

  const restart = () => {
    setScore(0);
    setLives(INITIAL_LIVES);
    setPaused(false);
    setOver(false);
    setSaved(false);
  };

  return (
    <div className="av-player fade-in">
      <Hud
        name={name}
        score={score}
        lives={lives}
        level={level}
        paused={paused}
        gameId={gameId}
        onTogglePause={() => setPaused((p) => !p)}
        onEnd={() => setOver(true)}
      />
      <CrtFrame title={title}>
        <div className="game-arena">
          <div className="grid-floor"></div>
          <div className="enemy e1"></div>
          <div className="enemy e2"></div>
          <div className="enemy e3"></div>
          <div className="player-ship"></div>
        </div>
        {paused && <CrtPause hint="PULSA REANUDAR PARA CONTINUAR" />}
      </CrtFrame>
      {over && (
        <GameOverModal
          score={score}
          name={name}
          saved={saved}
          onName={setNameEdit}
          onSave={() => setSaved(true)} // sin persistencia: solo muestra el toast
          onRestart={restart}
        />
      )}
    </div>
  );
}
