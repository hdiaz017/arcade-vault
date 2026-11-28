import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { createAsteroidsGame } from "@/lib/asteroids/engine";
import type { AsteroidsCallbacks, AsteroidsGame } from "@/lib/asteroids/types";

type Callbacks = AsteroidsCallbacks & {
  /** Se ha creado un motor: lo que quede de la partida anterior ya no vale. */
  onCreate: () => void;
};

type Props = Callbacks & {
  /** Aquí queda la partida en curso para que el reproductor la controle. */
  gameRef: RefObject<AsteroidsGame | null>;
};

/** Monta el canvas, crea el motor al mostrarse y lo destruye al ocultarse. */
export default function AsteroidsCanvas({
  gameRef,
  onCreate,
  onChange,
  onGameOver,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Los callbacks se guardan en una ref: si cambian, la partida no se reinicia.
  const callbacksRef = useRef<Callbacks>({ onCreate, onChange, onGameOver });
  useLayoutEffect(() => {
    callbacksRef.current = { onCreate, onChange, onGameOver };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = createAsteroidsGame(canvas, {
      onChange: (snapshot) => callbacksRef.current.onChange(snapshot),
      onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
    });
    gameRef.current = game;
    callbacksRef.current.onCreate();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, [gameRef]);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="Partida de Asteroids" />;
}
