import { errorResponse, json, preflight } from "../_shared/cors.ts";
import { getUser, userClient } from "../_shared/supabase.ts";
import { getItem } from "../_shared/pluggy.ts";
import { syncAccounts, syncTransactions } from "../_shared/sync.ts";

function mapStatus(status: string | undefined): string {
  switch ((status ?? "").toUpperCase()) {
    case "UPDATED":
      return "connected";
    case "UPDATING":
      return "updating";
    case "WAITING_USER_INPUT":
      return "waiting_consent";
    case "LOGIN_ERROR":
      return "login_error";
    case "OUTDATED":
      return "updating";
    default:
      return "connected";
  }
}

// Recebe a confirmação do consentimento (itemId) e persiste a conexão.
// Em seguida já dispara a primeira sincronização (contas + transações).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Não autenticado" }, 401);

    const body = (await req.json().catch(() => ({}))) as { itemId?: string };
    if (!body.itemId) return json({ error: "itemId é obrigatório" }, 400);

    const supabase = userClient(req);
    const item = await getItem(body.itemId);
    const connector = item.connector;

    const { data: connection, error } = await supabase
      .from("bank_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "pluggy",
          item_id: item.id,
          institution_id: connector?.id ?? item.institutionId ?? null,
          institution_name: connector?.name ?? null,
          institution_logo: connector?.imageUrl ?? null,
          status: mapStatus(item.status),
          consent_expires_at: item.consentExpiresAt ?? null,
        },
        { onConflict: "item_id" }
      )
      .select("id, user_id, item_id, last_sync_at")
      .single();
    if (error) throw error;

    const result = { accounts: 0, imported: 0 };
    try {
      const accounts = await syncAccounts(supabase, connection);
      result.accounts = accounts.length;
      const { imported } = await syncTransactions(supabase, connection);
      result.imported = imported;
      await supabase
        .from("bank_connections")
        .update({ last_sync_at: new Date().toISOString(), last_sync_status: "success" })
        .eq("id", connection.id);
    } catch (syncError) {
      await supabase
        .from("bank_connections")
        .update({
          last_sync_status: "error",
          last_error: syncError instanceof Error ? syncError.message : String(syncError),
        })
        .eq("id", connection.id);
    }

    return json({ connectionId: connection.id, ...result });
  } catch (e) {
    return errorResponse(e);
  }
});
