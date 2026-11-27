"use server";

import { Resend } from "resend";
import {
  CONTACT_FAILED_MESSAGE,
  validateContact,
  type ContactFields,
  type ContactState,
} from "@/lib/contact";


function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    msg: formData.get("msg"),
  };
  const typed: ContactFields = {
    name: text(raw.name),
    email: text(raw.email),
    msg: text(raw.msg),
  };

  // Honeypot: un bot lo llena. Respondemos éxito sin enviar nada.
  if (text(formData.get("website")).length > 0) {
    return { status: "success", name: typed.name.trim() };
  }

  const result = validateContact(raw);
  if (!result.ok) {
    return { status: "error", message: result.message, fields: typed };
  }
  const { name, email, msg } = result.data;

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error("[contact] Faltan variables de entorno de Resend");
    return { status: "error", message: CONTACT_FAILED_MESSAGE, fields: result.data };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${name.replace(/[\r\n]+/g, " ")}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}\n`,
    });
    if (error) {
      console.error("[contact] Resend devolvió un error:", error);
      return { status: "error", message: CONTACT_FAILED_MESSAGE, fields: result.data };
    }
  } catch (err) {
    console.error("[contact] Fallo al enviar con Resend:", err);
    return { status: "error", message: CONTACT_FAILED_MESSAGE, fields: result.data };
  }

  return { status: "success", name };
}

