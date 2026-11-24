export const CONTACT_LIMITS = {
  name: 80,
  email: 254,
  msg: 2000,
} as const;

export type ContactFields = {
  name: string;
  email: string;
  msg: string;
};

// Estado que devuelve la Server Action y consume useActionState
export type ContactState =
  | { status: "idle"; fields: ContactFields }
  | { status: "success"; name: string }
  | { status: "error"; message: string; fields: ContactFields };

export const CONTACT_INVALID_MESSAGE =
  "REVISA LOS CAMPOS E INTÉNTALO DE NUEVO.";
export const CONTACT_FAILED_MESSAGE =
  "NO PUDIMOS ENVIAR TU MENSAJE. INTÉNTALO MÁS TARDE.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(value: FormDataEntryValue | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateContact(
  raw: Record<string, FormDataEntryValue | null>,
): { ok: true; data: ContactFields } | { ok: false; message: string } {
  const data: ContactFields = {
    name: field(raw.name),
    email: field(raw.email),
    msg: field(raw.msg),
  };

  const valid =
    data.name.length > 0 &&
    data.email.length > 0 &&
    data.msg.length > 0 &&
    data.name.length <= CONTACT_LIMITS.name &&
    data.email.length <= CONTACT_LIMITS.email &&
    data.msg.length <= CONTACT_LIMITS.msg &&
    EMAIL_RE.test(data.email);

  return valid
    ? { ok: true, data }
    : { ok: false, message: CONTACT_INVALID_MESSAGE };
}
