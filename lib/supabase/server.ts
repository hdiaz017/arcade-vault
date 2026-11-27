import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

// Para Server Components, Server Actions y Route Handlers. Crear uno por
// petición. Usa cookies(): con cacheComponents, quien lo llame desde un
// componente debe estar dentro de <Suspense>.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Un Server Component no puede escribir cookies. El refresco de la
          // sesión se resolverá con proxy.ts en el spec de autenticación.
        }
      },
    },
  });
}
