import { errorResponse, json, preflight } from "../_shared/cors.ts";
import { authorize } from "../_shared/supabase.ts";
import { getConnections, syncTransactions } from "../_shared/sync.ts";

// Sincroniza transações (idempotente por external_id) e categoriza via IA.
// - Usuário autenticado: só as próprias conexões (RLS).
// - Cron (header x-cron-secret): todas as conexões, via service role.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const auth = await authorize(req, { allowCron: true });
    if (!auth) return json({ error: "Não autenticado" }, 401);

    const body = (await req.json().catch(() => ({}))) as { categorize?: boolean };
    const connections = await getConnections(auth.supabase, auth.userId);

    let imported = 0;
    const errors: string[] = [];

    for (const connection of connections) {
      try {
        const result = await syncTransactions(auth.supabase, connection, {
          categorize: body.categorize,
        });
        imported += result.imported;
        await auth.supabase
          .from("bank_connections")
          .update({ last_sync_at: new Date().toISOString(), last_sync_status: "success" })
          .eq("id", connection.id);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(`${connection.item_id}: ${message}`);
        await auth.supabase
          .from("bank_connections")
          .update({ last_sync_status: "error", last_error: message })
          .eq("id", connection.id);
      }
    }

    return json({ connections: connections.length, imported, errors });
  } catch (e) {
    return errorResponse(e);
  }
});
