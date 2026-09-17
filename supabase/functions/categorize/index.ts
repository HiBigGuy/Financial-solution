import { errorResponse, json, preflight } from "../_shared/cors.ts";
import { getUser, userClient } from "../_shared/supabase.ts";
import { classifyTransaction } from "../_shared/gemini.ts";
import { categorizeUncategorized } from "../_shared/sync.ts";

// Categoriza por IA.
// - Body com `transactionId`: categoriza uma transação específica.
// - Body vazio: categoriza em lote as transações importadas sem categoria.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Não autenticado" }, 401);

    const supabase = userClient(req);
    const body = (await req.json().catch(() => ({}))) as {
      transactionId?: string;
      limit?: number;
    };

    if (body.transactionId) {
      const { data: tx, error } = await supabase
        .from("transactions")
        .select("id, description, amount, type")
        .eq("id", body.transactionId)
        .single();
      if (error || !tx) return json({ error: "Transação não encontrada" }, 404);

      const { data: categories } = await supabase
        .from("categories")
        .select("id, name, kind")
        .eq("user_id", user.id);

      const kind = tx.type === "income" ? "income" : "expense";
      const options = (categories ?? [])
        .filter((c) => c.kind === kind)
        .map((c) => ({ id: c.id as string, name: c.name as string, kind }));

      if (!options.length) return json({ error: "Nenhuma categoria cadastrada" }, 400);

      const { categoryId, confidence } = await classifyTransaction({
        description: tx.description as string,
        amount: Number(tx.amount),
        kind,
        categories: options,
      });

      if (!categoryId) return json({ transactionId: tx.id, categoryId: null, confidence });

      await supabase
        .from("transactions")
        .update({
          category_id: categoryId,
          category_source: "ai",
          ai_suggested_category_id: categoryId,
          ai_confidence: confidence,
        })
        .eq("id", tx.id);

      return json({ transactionId: tx.id, categoryId, confidence });
    }

    const { categorized } = await categorizeUncategorized(supabase, user.id, body.limit ?? 25);
    return json({ categorized });
  } catch (e) {
    return errorResponse(e);
  }
});
