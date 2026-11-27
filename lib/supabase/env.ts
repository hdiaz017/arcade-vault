function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Defínela en .env (ver .env.example).`,
    );
  }
  return value;
}

// Las referencias a process.env deben ser literales: Next solo las incluye en
// el bundle de cliente si son estáticas. Se valida al llamar, no al importar.
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  return {
    url: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}
