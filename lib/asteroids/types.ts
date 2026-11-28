// Contrato entre el motor de Asteroids y React.

export type AsteroidsSnapshot = {
  score: number;
  lives: number; // 3 → 0
  level: number; // empieza en 1
};

export type AsteroidsCallbacks = {
  onChange: (snapshot: AsteroidsSnapshot) => void;
  onGameOver: (finalScore: number) => void;
};

export type AsteroidsGame = {
  setPaused: (paused: boolean) => void;
  end: () => void; // termina la partida (botón FIN)
  restart: () => void;
  destroy: () => void; // cancela el frame y quita los listeners
};
