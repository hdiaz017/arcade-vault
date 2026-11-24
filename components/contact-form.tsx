"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendContact } from "@/app/about/actions";
import type { ContactState } from "@/lib/contact";

const INITIAL_STATE: ContactState = {
  status: "idle",
  fields: { name: "", email: "", msg: "" },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="btn xl press"
      type="submit"
      disabled={pending}
      style={{ width: "100%" }}
    >
      {pending ? "ENVIANDO…" : "▶  ENVIAR MENSAJE"}
    </button>
  );
}

function ContactFormInner({ onReset }: { onReset: () => void }) {
  // Cambiar `shakeKey` remonta el <form> y reinicia la animación en cada error.
  const [shakeKey, setShakeKey] = useState(0);

  const [state, formAction] = useActionState(
    async (prev: ContactState, formData: FormData) => {
      const next = await sendContact(prev, formData);
      if (next.status === "error") setShakeKey((k) => k + 1);
      return next;
    },
    INITIAL_STATE,
  );

  const shaking = state.status === "error" && shakeKey > 0;

  return (
    <form
      key={shakeKey}
      className={"contact-form" + (shaking ? " shake" : "")}
      action={formAction}
      noValidate
    >
      {state.status === "success" ? (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={onReset}>
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              defaultValue={state.fields.name}
              placeholder="px_kai"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              defaultValue={state.fields.email}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label htmlFor="contact-msg">MENSAJE</label>
            <textarea
              id="contact-msg"
              name="msg"
              rows={5}
              defaultValue={state.fields.msg}
              placeholder="Cuéntanos qué tienes en mente…"
            ></textarea>
          </div>

          {/* Honeypot: fuera de pantalla, sin foco y ignorado por lectores de pantalla */}
          <div
            aria-hidden="true"
            style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}
          >
            <label htmlFor="contact-website">NO LLENAR</label>
            <input
              id="contact-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>

          {state.status === "error" && (
            <p className="form-error" role="alert">
              {state.message}
            </p>
          )}
          <SubmitButton />
        </>
      )}
    </form>
  );
}

export default function ContactForm() {
  // Cambiar la key remonta el formulario con estado y campos vacíos.
  const [formKey, setFormKey] = useState(0);
  return <ContactFormInner key={formKey} onReset={() => setFormKey((k) => k + 1)} />;
}
