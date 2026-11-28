import type { ReactNode } from "react";

/** Marco de monitor CRT: `children` ocupa la pantalla. */
export default function CrtFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="crt">
      <div className="crt-screen">{children}</div>
      <div className="crt-bottom">
        <span className="led">SEÑAL OK</span>
        <span>{title} · CRT-83 · 60 HZ</span>
        <span>CARGA · 1MB</span>
      </div>
    </div>
  );
}

/** Capa "EN PAUSA" sobre la pantalla; `hint` explica cómo continuar. */
export function CrtPause({ hint }: { hint: string }) {
  return (
    <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
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
          {hint}
        </div>
      </div>
    </div>
  );
}
