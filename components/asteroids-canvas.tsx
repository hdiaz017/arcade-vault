import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { createAsteroidsGame } from "@/lib/asteroids/engine";
import type { AsteroidsCallbacks, AsteroidsGame } from "@/lib/asteroids/types";

type Props = AsteroidsCallbacks & {
  /** Aquí queda la partida en curso para que el reproductor la controle. */
  gameRef: RefObject<AsteroidsGame | null>;
};

/** Monta el canvas, crea el motor al mostrarse y lo destruye al ocultarse. */
export default function AsteroidsCanvas({ gameRef, onChange, onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Los callbacks se guardan en una ref: si cambian, la partida no se reinicia.
  const callbacksRef = useRef<AsteroidsCallbacks>({ onChange, onGameOver });
  useLayoutEffect(() => {
    callbacksRef.current = { onChange, onGameOver };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createAsteroidsGame(canvas, {
      onChange: (snapshot) => callbacksRef.current.onChange(snapshot),
      onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
    });
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [gameRef]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Partida de Asteroids" />;
}
