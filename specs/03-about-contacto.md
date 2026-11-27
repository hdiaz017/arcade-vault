# SPEC 03 — Pantalla About y envío real de correos de contacto

> **Status:** implemented
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-23
> **Objective:** Agregar la pantalla About en `/about` portada de `references/templates/home-about/about.jsx` y hacer que su formulario de contacto envíe un correo real con Resend mediante una Server Action.

---

## Por qué existe este spec

El SPEC 02 dejó el enlace "Acerca de" apuntando a `/about`, que hoy da 404. El template (`about.jsx`) trae la pantalla completa, pero su formulario solo simula el envío: muestra la terminal de éxito sin mandar nada. Este spec crea la ruta y convierte esa simulación en un envío real.

Es el primer spec con **código de servidor y dependencia externa**: añade `resend`, variables de entorno y una Server Action. Por eso las decisiones de validación, anti-spam y manejo de errores quedan escritas aquí; el template no define ninguna.

Los estilos de About existen en `references/templates/home-about/styles.css` (bloque `ABOUT PAGE`, líneas ~1071–1150) pero **no** están en `app/globals.css`. Hay que portarlos.

---

## Scope

**In:**

- Pantalla About en `/about` con las secciones del template: hero "ACERCA DE ARCADE VAULT" con 3 highlights, divisor de píxeles y sección "CONTÁCTANOS".
- Íconos pixel de los highlights (`HEART`, `BROWSER`, `PLANT`).
- Animación `reveal` en el divisor y la sección de contacto, reutilizando `components/reveal.tsx`.
- Formulario de contacto (nombre, correo, mensaje) con el flujo del template: animación `shake` si falta un campo, terminal de éxito con "ENVIAR OTRO MENSAJE".
- Envío real con Resend desde una Server Action (`'use server'`), sin endpoint REST público.
- Validación en el servidor (campos obligatorios, formato de correo, longitudes máximas) y campo honeypot oculto.
- Correo entregado solo al equipo (`CONTACT_TO_EMAIL`), con `Reply-To` igual al correo del visitante. Sin autorespuesta.
- Estado de carga: botón deshabilitado con texto "ENVIANDO…" mientras la acción corre.
- Estado de error: mensaje inline sobre el botón, formulario con los campos conservados, y `shake`.
- Portar a `app/globals.css` el bloque `ABOUT PAGE` del template (incluye `@keyframes shake`) y los estilos del mensaje de error.
- Variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` y un `.env.example` documentado.
- `metadata` de `/about` (título "Acerca de" y descripción SEO).
- Textos en español, tal como el template.

**Out of scope (para futuros specs):**

- Guardar los mensajes en base de datos o cualquier backend de persistencia.
- Autorespuesta o correo de confirmación al visitante.
- Rate limit por IP, captcha o Turnstile. Solo validación de servidor + honeypot.
- Dominio propio verificado en Resend (el default `onboarding@resend.dev` basta por ahora).
- Plantillas de correo con React Email o HTML elaborado: el correo es texto plano.
- Cambios al nav (ya enlaza a `/about` desde el SPEC 02).
- Variantes de tema del template (`Theme variants`) y panel de tweaks.
- Tests automatizados.
- i18n: solo español.

---

## Data model

```ts
// lib/contact.ts
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
   | { status: 'idle'; fields: ContactFields }
   | { status: 'success'; name: string }
   | { status: 'error'; message: string; fields: ContactFields };

export function validateContact(
   raw: Record<string, FormDataEntryValue | null>,
): { ok: true; data: ContactFields } | { ok: false; message: string };
```

```ts
// app/about/actions.ts  ('use server')
export async function sendContact(
   prev: ContactState,
   formData: FormData,
): Promise<ContactState>;
```

```bash
# .env.example
RESEND_API_KEY=            # clave de Resend (https://resend.com/api-keys)
CONTACT_TO_EMAIL=          # dirección que recibe los mensajes
CONTACT_FROM_EMAIL=onboarding@resend.dev  # remitente; cambiar al verificar dominio
```

Convenciones:

- El formulario envía los campos `name`, `email`, `msg` y el honeypot `website` (oculto, debe llegar vacío).
- Se aplica `trim()` a los tres campos antes de validar.
- Honeypot lleno: la acción responde `success` sin enviar nada, para no dar pista al bot.
- Correo enviado: asunto `[Arcade Vault] Mensaje de {name}`, `from` = `CONTACT_FROM_EMAIL`, `to` = `CONTACT_TO_EMAIL`, `replyTo` = correo del visitante, cuerpo en texto plano con nombre, correo y mensaje.
- La clave de Resend se lee solo dentro de la Server Action; nunca con prefijo `NEXT_PUBLIC_`.
- Mensajes de error al usuario (texto fijo, sin filtrar detalles del proveedor):
   - Campo faltante o inválido: "REVISA LOS CAMPOS E INTÉNTALO DE NUEVO."
   - Fallo de Resend o variables de entorno ausentes: "NO PUDIMOS ENVIAR TU MENSAJE. INTÉNTALO MÁS TARDE."

### Mapa de rutas (cambios)

| Pantalla  | Ruta antes | Ruta ahora | Componente                                         |
| --------- | ---------- | ---------- | -------------------------------------------------- |
| Acerca de | 404        | `/about`   | Página servidor + `ContactForm` cliente + `Reveal` |

El resto de rutas no cambia.

---

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/01-app` las guías de Server Actions / `'use server'`, formularios y `useActionState`, variables de entorno y `metadata`, tal como exige `AGENTS.md`. Aplicar `/frontend-design` según `CLAUDE.md`, con fidelidad al template por encima de reinterpretar.

1. **Estilos.** Copiar de `references/templates/home-about/styles.css` a `app/globals.css` el bloque `ABOUT PAGE` (líneas ~1071–1150, incluye `.contact-form.shake`, `@keyframes shake` y `.terminal-success`). No copiar `Theme variants`. Añadir `.form-error` (texto de error con el estilo neón del tema) y `.field textarea` / `.field input:disabled` si faltan; `grep` de cada clase usada en `about.jsx` contra `globals.css`. Verificación: `pnpm run build` pasa y Home y Biblioteca se ven igual que antes.
2. **Validación.** Crear `lib/contact.ts` con `CONTACT_LIMITS`, los tipos y `validateContact` (obligatorios, correo con regex simple, longitudes máximas). Verificación: `pnpm exec tsc --noEmit` y `pnpm run lint` pasan.
3. **Dependencia y entorno.** Instalar `resend` con `pnpm add resend`. Crear `.env.example` con las tres variables. Verificación: `package.json` solo suma `resend` y `.env.example` queda versionado (el `.gitignore` ignora `.env*`: añadir la excepción `!.env.example`).
4. **Server Action.** Crear `app/about/actions.ts` con `sendContact`: honeypot, `validateContact`, comprobar que existen las tres variables de entorno, enviar con Resend y devolver `ContactState`. Capturar excepciones y devolver el mensaje genérico; registrar el error real con `console.error` en el servidor. Verificación: `tsc` y `lint` pasan.
5. **Íconos y About estático.** Crear `components/highlight-icon.tsx` (3 SVG, servidor) y `app/about/page.tsx` con hero, 3 highlights con `transitionDelay`, divisor de 24 píxeles dentro de `Reveal` y la sección de contacto con intro y tips, con un formulario aún no funcional. Verificación: `/about` renderiza sin 404 y el enlace "Acerca de" del nav queda activo.
6. **Formulario cliente.** Crear `components/contact-form.tsx` (cliente) con `useActionState(sendContact, …)`, campos controlados con `defaultValue` desde `state.fields`, honeypot oculto fuera de pantalla (`aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`), botón deshabilitado con "ENVIANDO…" mediante `useFormStatus`, `shake` ante error, mensaje inline `.form-error` y la terminal de éxito con "ENVIAR OTRO MENSAJE". Conectarlo en `app/about/page.tsx`. Verificación: con claves reales, enviar el formulario entrega el correo; con campos vacíos se ve el error.
7. **Metadata y cierre.** Añadir `metadata` a `/about`. Verificación: `pnpm run build` y `pnpm run lint` pasan.

---

## Acceptance criteria

- [ ] `pnpm run build` termina sin errores y `pnpm run lint` sin errores.
- [ ] `/about` devuelve 200 y muestra el título "ACERCA DE ARCADE VAULT", el texto de misión y 3 highlights ("HECHO CON ❤️ PARA JUGADORES", "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", "PROYECTO EN CONSTANTE CRECIMIENTO").
- [ ] El divisor muestra 24 píxeles animados y, junto con la sección de contacto, recibe la clase `in` al entrar al viewport.
- [ ] La sección de contacto muestra "CONTÁCTANOS", el subtítulo y los 3 tips ("RESPUESTA EN 24-48H", "SUGERENCIAS BIENVENIDAS", "SIN SPAM, JAMÁS").
- [ ] En el nav, "Acerca de" aparece activo en `/about`.
- [ ] Enviar el formulario con nombre, correo y mensaje válidos entrega un correo a `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de {nombre}`.
- [ ] El correo recibido tiene `Reply-To` igual al correo del visitante y su cuerpo incluye nombre, correo y mensaje.
- [ ] Tras un envío exitoso se muestra la terminal "VAULT-OS // TERMINAL" con "MENSAJE RECIBIDO… GRACIAS, {NOMBRE EN MAYÚSCULAS}.".
- [ ] "ENVIAR OTRO MENSAJE" vuelve al formulario con los tres campos vacíos.
- [ ] Mientras la acción corre, el botón está deshabilitado y muestra "ENVIANDO…".
- [ ] Enviar con un campo vacío muestra "REVISA LOS CAMPOS E INTÉNTALO DE NUEVO.", aplica `shake` y no envía correo.
- [ ] Enviar con un correo sin formato válido muestra el mismo error y no envía correo.
- [ ] Un mensaje de más de 2000 caracteres es rechazado por el servidor.
- [ ] Tras un error, los tres campos conservan lo que el usuario escribió.
- [ ] Con el campo honeypot `website` lleno, la acción responde éxito y no se llama a Resend.
- [ ] Con `RESEND_API_KEY` ausente o inválida se muestra "NO PUDIMOS ENVIAR TU MENSAJE. INTÉNTALO MÁS TARDE." y la respuesta no contiene el texto del error del proveedor.
- [ ] `RESEND_API_KEY` no aparece en el bundle de cliente (búsqueda del valor en `.next/static` sin resultados).
- [ ] El campo honeypot no es visible ni alcanzable con Tab.
- [ ] `.env.example` existe, está versionado y no contiene valores reales.
- [ ] `package.json` solo agrega la dependencia `resend`.
- [ ] `/about` no produce errores ni warnings de hydration en la consola.
- [ ] `app/globals.css` contiene el bloque `ABOUT PAGE` y no contiene `Theme variants`.

---

## Decisions

- **Sí:** Resend como proveedor. API mínima, plan gratuito y un solo secreto; encaja con un proyecto sin backend propio.
- **No:** Nodemailer + SMTP. Exige host, puerto y credenciales, y mantener una cuenta SMTP.
- **Sí:** Server Action con `useActionState`. Sin endpoint público que proteger ni mantener, y es el patrón idiomático de Next 16 para formularios.
- **No:** Route Handler `POST /api/contact`. Solo se justificaría si otro cliente (app móvil, webhook) lo consumiera.
- **Sí:** correo solo al equipo con `Reply-To` del visitante. Permite responder directamente desde el cliente de correo.
- **No:** autorespuesta al visitante. Duplica envíos y convierte el formulario en un posible relay de spam hacia terceros.
- **Sí:** validación en el servidor más honeypot. Cubre la mayoría del spam trivial sin dependencias ni captcha.
- **No:** rate limit en memoria. No persiste entre instancias serverless y da falsa sensación de protección; si hace falta, va en otro spec con almacenamiento compartido.
- **Sí:** el honeypot responde `success` sin enviar. Un bot que recibe un error aprende a evadirlo.
- **Sí:** error inline con campos conservados. El usuario no pierde su mensaje y puede reintentar; reutiliza `shake` del template.
- **No:** terminal en modo error. Más temático, pero exige CSS nuevo y complica el estado.
- **Sí:** `CONTACT_FROM_EMAIL` con default `onboarding@resend.dev`. Funciona sin dominio verificado, con la limitación de entregar solo al correo de la cuenta de Resend.
- **Sí:** botón con estado de carga ("ENVIANDO…"). Evita doble envío; el template no lo tenía porque no había red.
- **Sí:** correo en texto plano. Suficiente para un mensaje de contacto y sin riesgo de inyección HTML; el contenido del visitante nunca se interpreta como HTML.
- **Sí:** reutilizar `components/reveal.tsx` del SPEC 02 en vez de repetir el `IntersectionObserver` del template.
- **Sí:** copiar solo el bloque `ABOUT PAGE` del CSS. Los temas siguen fuera, igual que en el SPEC 02.
- **Sí:** `Link`/enlaces del nav sin cambios. El SPEC 02 ya dejó "Acerca de" apuntando a `/about`.

---

## Risks

| Riesgo                                                                                                    | Mitigación                                                                                                                      |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `onboarding@resend.dev` solo entrega al correo dueño de la cuenta de Resend                               | `CONTACT_TO_EMAIL` debe ser ese correo mientras no haya dominio verificado; documentarlo en `.env.example`.                     |
| Sin rate limit, un bot puede disparar muchos envíos a la cuenta de Resend                                 | Honeypot y validación reducen lo trivial; el límite del plan gratuito de Resend actúa de tope. Rate limit queda para otro spec. |
| Variables de entorno ausentes en despliegue y fallo silencioso                                            | La acción comprueba las tres variables y devuelve el error genérico; el detalle va a `console.error`.                           |
| Inyección de cabeceras vía nombre o correo                                                                | Resend recibe campos como parámetros estructurados, no cabeceras en bruto; el asunto se limpia de saltos de línea.              |
| `useActionState` limpia los campos del formulario tras la acción (React 19 reinicia formularios)          | Reponer los valores con `defaultValue` desde `state.fields` en el estado de error.                                              |
| La clave de Resend se filtra al cliente                                                                   | Se lee solo en `app/about/actions.ts`; sin prefijo `NEXT_PUBLIC_`; criterio de aceptación verifica el bundle.                   |
| `.gitignore` ignora `.env*` y el `.env.example` no se versiona                                            | Paso 3 añade la excepción `!.env.example`.                                                                                      |
| Next 16 cambia APIs respecto al conocimiento previo (Server Actions, `useActionState`, `cacheComponents`) | Consultar `node_modules/next/dist/docs/` antes de cada pieza, como en los SPEC 01 y 02.                                         |

---

## What is **not** in this spec

- Guardar mensajes en base de datos o panel de administración de mensajes.
- Autorespuesta o correo de confirmación al visitante.
- Rate limit, captcha o Turnstile.
- Dominio propio verificado en Resend ni plantillas de correo HTML.
- Cambios al nav, variantes de tema o panel de tweaks.
- Tests automatizados.

Cada uno de esos puntos, si se aborda, va en su propio spec.
