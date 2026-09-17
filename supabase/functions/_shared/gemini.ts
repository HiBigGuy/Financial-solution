import { requireEnv } from "./supabase.ts";

/** Cliente mínimo da Gemini API. A chave fica apenas no secret da Edge Function. */

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
}

async function generateContent(system: string, prompt: string): Promise<string> {
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.0-flash-lite";
  const apiKey = encodeURIComponent(requireEnv("GEMINI_API_KEY"));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 512, temperature: 0.2 },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Gemini falhou (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as GeminiResponse;
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function parseJson<T>(text: string): T | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

export interface CategoryOption {
  id: string;
  name: string;
  kind: "income" | "expense";
}

export interface CategoryExample {
  description: string;
  category: string;
}

export async function classifyTransaction(input: {
  description: string;
  amount: number;
  kind: "income" | "expense";
  categories: CategoryOption[];
  examples?: CategoryExample[];
}): Promise<{ categoryId: string | null; confidence: number }> {
  const { description, amount, kind, categories, examples = [] } = input;
  if (!categories.length) return { categoryId: null, confidence: 0 };

  const system = [
    "Você é um classificador de transações financeiras pessoais no Brasil.",
    "Escolha a categoria mais provável para a transação dentre as fornecidas.",
    'Responda APENAS com JSON no formato {"category_id":"<id>","confidence":<0..1>}.',
    "Se nenhuma categoria servir, use category_id null e confidence 0.",
  ].join(" ");

  const text = await generateContent(
    system,
    JSON.stringify({ description, amount, kind, categories, examples })
  );
  const parsed = parseJson<{ category_id?: string | null; confidence?: number }>(text);
  if (!parsed) return { categoryId: null, confidence: 0 };

  const categoryId =
    parsed.category_id && categories.some((category) => category.id === parsed.category_id)
      ? parsed.category_id
      : null;
  const confidence =
    typeof parsed.confidence === "number" ? Math.min(Math.max(parsed.confidence, 0), 1) : 0;
  return { categoryId, confidence };
}

export async function generateInsight(input: {
  month: string;
  income: number;
  expense: number;
  byCategory: { name: string; total: number }[];
  prev?: { income: number; expense: number } | null;
}): Promise<string> {
  const system = [
    "Você é um assistente financeiro pessoal no Brasil.",
    "Gere um resumo curto (2 a 3 frases), em português do Brasil, direto e útil,",
    "destacando tendências de gastos e receitas do mês. Não use markdown.",
  ].join(" ");

  return generateContent(system, JSON.stringify(input));
}