import Link from "next/link";

type Props = {
  score: number;
  name: string;
  saved: boolean;
  onName: (v: string) => void;
  onSave: () => void;
  onRestart: () => void;
};

export default function GameOverModal(props: Props) {
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
