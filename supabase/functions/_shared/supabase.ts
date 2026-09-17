import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

export function adminClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(req: Request): SupabaseClient {
  const auth = req.headers.get("Authorization") ?? "";
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getUser(req: Request): Promise<User | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export interface AuthResult {
  mode: "user" | "cron";
  userId: string | null;
  supabase: SupabaseClient;
}

export async function authorize(
  req: Request,
  opts: { allowCron?: boolean } = {}
): Promise<AuthResult | null> {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (opts.allowCron && cronSecret && provided === cronSecret) {
    return { mode: "cron", userId: null, supabase: adminClient() };
  }
  const user = await getUser(req);
  if (!user) return null;
  return { mode: "user", userId: user.id, supabase: userClient(req) };
}
