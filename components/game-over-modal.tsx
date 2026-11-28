import Link from "next/link";

type Props = {
  score: number;
  name: string;
  saved: boolean;
  // Solo para guardado real; la demo no las pasa.
  saving?: boolean;
  error?: boolean;
  canSave?: boolean;
  onName: (v: string) => void;
  onSave: () => void;
  onRestart: () => void;
};

export default function GameOverModal(props: Props) {
  const { saving = false, error = false, canSave = true } = props;

  return (
    <div className="modal-bd">
      <div className="modal">
        <h2>FIN DEL JUEGO</h2>
        <div className="final-label">PUNTUACIÓN FINAL</div>
        <div className="final">{props.score.toLocaleString("es-ES")}</div>
        {!props.saved ? (
          <>
            <div className="input-row">
              <input
                value={props.name}
                onChange={(e) =>
                  props.onName(e.target.value.toUpperCase().slice(0, 10))
                }
                placeholder="TUS INICIALES"
                disabled={saving}
              />
              <button
                type="button"
                className="btn yellow"
                onClick={props.onSave}
                disabled={saving || !canSave}
                aria-busy={saving}
              >
                {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
              </button>
            </div>
            {error && (
              <p className="save-error" role="alert">
                NO SE PUDO GUARDAR. INTÉNTALO DE NUEVO.
              </p>
            )}
          </>
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
