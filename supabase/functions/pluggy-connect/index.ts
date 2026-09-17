import { errorResponse, json, preflight } from "../_shared/cors.ts";
import { getUser } from "../_shared/supabase.ts";
import { createConnectToken } from "../_shared/pluggy.ts";

// Gera o connect token do Pluggy Connect Widget.
// Se `itemId` for enviado, o widget abre em modo de reconexão/atualização.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Não autenticado" }, 401);

    const body = (await req.json().catch(() => ({}))) as { itemId?: string };
    const { accessToken } = await createConnectToken({
      itemId: body.itemId,
      clientUserId: user.id,
    });
    return json({ connectToken: accessToken });
  } catch (e) {
    return errorResponse(e);
  }
});
