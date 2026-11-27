import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

// Para Client Components.
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
