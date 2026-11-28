"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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

const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";

function subscribeTouch(onChange: () => void) {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const isTouchDevice = () => window.matchMedia(TOUCH_QUERY).matches;

// En el servidor no se sabe: hasta saberlo no se crea ninguna partida.
const unknownDevice = () => null;

// Un botón con el foco se volvería a activar al disparar con Espacio.
function releaseFocus() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

export default function AsteroidsPlayer({ gameId, title }: Props) {
  const user = useSession();
  const touch = useSyncExternalStore<boolean | null>(
    subscribeTouch,
    isTouchDevice,
    unknownDevice,
  );
  const playable = touch === false;
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

  // Tecla P y pausa automática; sin partida en curso no hacen nada.
  useEffect(() => {
    if (!playable || over) return;
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
  }, [playable, over]);

  const togglePause = () => {
    releaseFocus();
    if (playable && !over) setPaused((p) => !p);
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

  // Al volver a la ruta React conserva el estado: hay que limpiarlo.
  const resetMatchState = () => {
    setPaused(false);
    setFinalScore(null);
    setSaved(false);
  };

  const restart = () => {
    gameRef.current?.restart();
    resetMatchState();
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
        {playable && (
          <AsteroidsCanvas
            gameRef={gameRef}
            onCreate={resetMatchState}
            onChange={setSnapshot}
            onGameOver={handleGameOver}
          />
        )}
        {touch && (
          <div className="crt-content">
            <div className="pixel neon-yellow" style={{ fontSize: 16, lineHeight: 1.8, padding: 24 }}>
              ESTE JUEGO NECESITA TECLADO
            </div>
          </div>
        )}
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
