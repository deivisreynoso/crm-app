export class SupabaseConfigError extends Error {
  readonly code = "SUPABASE_CONFIG";

  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

/** Validates Supabase env before client creation. */
export function getSupabaseServerConfig(context: string) {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url) {
    throw new SupabaseConfigError(
      `NEXT_PUBLIC_SUPABASE_URL is missing (${context}). Add it to .env.local and rebuild/restart Docker.`
    );
  }
  if (!serviceKey) {
    throw new SupabaseConfigError(
      `SUPABASE_SERVICE_ROLE_KEY is missing (${context}). Add it to .env.local and restart the app container.`
    );
  }

  return { url, serviceKey };
}

export function getSupabaseBrowserConfig(context: string) {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new SupabaseConfigError(
      `Supabase browser config is missing (${context}). Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then rebuild.`
    );
  }

  return { url, anonKey };
}
