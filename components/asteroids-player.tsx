"use client";

import { useEffect, useRef, useState } from "react";
import AsteroidsCanvas from "@/components/asteroids-canvas";
import CrtFrame, { CrtPause } from "@/components/crt-frame";
import GameOverModal from "@/components/game-over-modal";
import Hud from "@/components/player-hud";
import { START_LIVES } from "@/lib/asteroids/constants";
import { isTextField } from "@/lib/asteroids/input";
import type { AsteroidsGame, AsteroidsSnapshot } from "@/lib/asteroids/types";
import { useSession } from "@/lib/session";

// Lo que muestra el HUD hasta que el motor envía sus datos.
const INITIAL_SNAPSHOT: AsteroidsSnapshot = { score: 0, lives: START_LIVES, level: 1 };

type Props = { gameId: string; title: string };

// Un botón con el foco se volvería a activar al disparar con Espacio.
function releaseFocus() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

export default function AsteroidsPlayer({ gameId, title }: Props) {
  const user = useSession();
  const gameRef = useRef<AsteroidsGame | null>(null);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [paused, setPaused] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const name = nameEdit ?? user?.name ?? "INVITADO";
  const over = finalScore !== null;

  useEffect(() => {
    gameRef.current?.setPaused(paused);
  }, [paused]);

  // Tecla P y pausa automática; con la partida terminada no hacen nada.
  useEffect(() => {
    if (over) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "KeyP" || event.repeat || isTextField(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return; // atajos del navegador
      setPaused((p) => !p);
    };
    const onBlur = () => setPaused(true);
    const onVisibilityChange = () => {
      if (document.hidden) setPaused(true);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [over]);

  const togglePause = () => {
    releaseFocus();
    if (!over) setPaused((p) => !p);
  };

  // El motor responde con `onGameOver`, igual que al perder la última vida.
  const end = () => {
    releaseFocus();
    gameRef.current?.end();
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setPaused(false);
  };

  const restart = () => {
    gameRef.current?.restart();
    setPaused(false);
    setFinalScore(null);
    setSaved(false);
  };

  return (
    <div className="av-player fade-in">
      <Hud
        name={name}
        score={snapshot.score}
        lives={snapshot.lives}
        level={snapshot.level}
        paused={paused}
        gameId={gameId}
        onTogglePause={togglePause}
        onEnd={end}
      />
      <CrtFrame title={title}>
        <AsteroidsCanvas
          gameRef={gameRef}
          onChange={setSnapshot}
          onGameOver={handleGameOver}
        />
        {paused && !over && <CrtPause hint="PULSA REANUDAR O LA TECLA P" />}
      </CrtFrame>
      {finalScore !== null && (
        <GameOverModal
          score={finalScore}
          name={name}
          saved={saved}
          onName={setNameEdit}
          onSave={() => setSaved(true)} // sin persistencia: solo muestra el aviso
          onRestart={restart}
        />
      )}
    </div>
  );
}
