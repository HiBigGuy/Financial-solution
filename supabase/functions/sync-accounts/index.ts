import { errorResponse, json, preflight } from "../_shared/cors.ts";
import { authorize } from "../_shared/supabase.ts";
import { getConnections, syncAccounts } from "../_shared/sync.ts";

// Sincroniza contas/cartões das conexões Open Finance.
// - Usuário autenticado: apenas as próprias conexões (RLS).
// - Cron (header x-cron-secret): todas as conexões, via service role.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const auth = await authorize(req, { allowCron: true });
    if (!auth) return json({ error: "Não autenticado" }, 401);

    const connections = await getConnections(auth.supabase, auth.userId);
    let accounts = 0;
    const errors: string[] = [];

    for (const connection of connections) {
      try {
        accounts += (await syncAccounts(auth.supabase, connection)).length;
      } catch (e) {
        errors.push(`${connection.item_id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return json({ connections: connections.length, accounts, errors });
  } catch (e) {
    return errorResponse(e);
  }
});
