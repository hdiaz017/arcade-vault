// Comprueba la URL y la clave publishable contra el proyecto real.
// Uso: pnpm run check:supabase
// La salida nunca debe incluir la clave ni valores de configuración sin validar.

const TIMEOUT_MS = 10_000;

async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !key && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    const subject =
      missing.length > 1
        ? "Faltan las variables de entorno"
        : "Falta la variable de entorno";
    throw new Error(
      `${subject} ${missing.join(" y ")}. Revisa .env (ver .env.example).`,
    );
  }

  let response;
  try {
    response = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/settings`, {
      headers: { apikey: key },
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new Error(`Sin respuesta en ${TIMEOUT_MS / 1000} segundos.`);
    }
    // No se usa error.message: puede contener la URL o la clave.
    const detail = error.cause?.code ?? error.cause?.message ?? error.name;
    throw new Error(
      `No se pudo conectar (${String(detail).replaceAll(key, "[clave]")}).`,
    );
  }

  await response.body?.cancel();

  if (!response.ok) {
    throw new Error(`Supabase respondió HTTP ${response.status}.`);
  }

  return response.status;
}

try {
  const status = await check();
  console.log(`OK: conexión con Supabase verificada (HTTP ${status}).`);
} catch (error) {
  // Salida explícita: tras un timeout, la conexión pendiente mantendría vivo el
  // proceso más allá del límite.
  process.stderr.write(`ERROR: ${error.message}\n`, () => process.exit(1));
}
