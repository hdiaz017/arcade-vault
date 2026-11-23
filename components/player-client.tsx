"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/session";

const INITIAL_LIVES = 3;
const POINTS_PER_LEVEL = 2500;

type Props = { gameId: string; title: string };

function Hud(props: {
  name: string;
  score: number;
  lives: number;
  level: number;
  paused: boolean;
  gameId: string;
  onTogglePause: () => void;
  onEnd: () => void;
}) {
  const { name, score, lives, level, paused, gameId } = props;
  return (
    <div className="player-hud">
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div className="hud-stat">
          <div className="l">Jugador</div>
          <div className="v" style={{ color: "var(--ink)" }}>{name}</div>
        </div>
        <div className="hud-stat">
          <div className="l">Puntuación</div>
          <div className="v">{score.toLocaleString("es-ES")}</div>
        </div>
        <div className="hud-stat lives">
          <div className="l">Vidas</div>
          <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
        </div>
        <div className="hud-stat level">
          <div className="l">Nivel</div>
          <div className="v">{String(level).padStart(2, "0")}</div>
        </div>
      </div>
      <div className="hud-actions">
        <button type="button" className="btn yellow" onClick={props.onTogglePause}>
          {paused ? "REANUDAR" : "PAUSA"}
        </button>
        <button type="button" className="btn magenta" onClick={props.onEnd}>
          FIN
        </button>
        <Link href={`/juegos/${gameId}`} className="btn ghost">
          SALIR
        </Link>
      </div>
    </div>
  );
}

function Crt({ title, paused }: { title: string; paused: boolean }) {
  return (
    <div className="crt">
      <div className="crt-screen">
        <div className="game-arena">
          <div className="grid-floor"></div>
          <div className="enemy e1"></div>
          <div className="enemy e2"></div>
          <div className="enemy e3"></div>
          <div className="player-ship"></div>
        </div>
        {paused && (
          <div
            className="crt-content"
            style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
          >
            <div>
              <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                EN PAUSA
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--ink-dim)",
                  marginTop: 10,
                  letterSpacing: "0.16em",
                }}
              >
                PULSA REANUDAR PARA CONTINUAR
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="crt-bottom">
        <span className="led">SEÑAL OK</span>
        <span>{title} · CRT-83 · 60 HZ</span>
        <span>CARGA · 1MB</span>
      </div>
    </div>
  );
}

function GameOverModal(props: {
  score: number;
  name: string;
  saved: boolean;
  onName: (v: string) => void;
  onSave: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="modal-bd">
      <div className="modal">
        <h2>FIN DEL JUEGO</h2>
        <div className="final-label">PUNTUACIÓN FINAL</div>
        <div className="final">{props.score.toLocaleString("es-ES")}</div>
        {!props.saved ? (
          <div className="input-row">
            <input
              value={props.name}
              onChange={(e) =>
                props.onName(e.target.value.toUpperCase().slice(0, 10))
              }
              placeholder="TUS INICIALES"
            />
            <button type="button" className="btn yellow" onClick={props.onSave}>
              GUARDAR PUNTUACIÓN
            </button>
          </div>
        ) : (
          <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
        )}
        <div className="actions">
          <button type="button" className="btn" onClick={props.onRestart}>
            JUGAR DE NUEVO
          </button>
          <Link href="/games" className="btn magenta">
            VOLVER AL VAULT
          </Link>
        </div>
      </div>
    </div>
  );
}

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
      <Crt title={title} paused={paused} />
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
