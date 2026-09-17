import type { CategoryOption } from "./gemini.ts";

interface Rule {
  keywords: string[];
  categoryTerms: string[];
}

const RULES: Rule[] = [
  { keywords: ["uber", "99", "taxi", "gasolina", "combustivel", "estacionamento", "metro", "onibus"], categoryTerms: ["transporte", "mobilidade"] },
  { keywords: ["ifood", "rappi", "restaurante", "lanchonete", "delivery", "padaria"], categoryTerms: ["alimentacao", "comida", "refeicao"] },
  { keywords: ["mercado", "supermercado", "carrefour", "assai", "pao de acucar"], categoryTerms: ["alimentacao", "mercado"] },
  { keywords: ["netflix", "spotify", "prime video", "disney", "cinema", "steam"], categoryTerms: ["lazer", "assinatura", "entretenimento"] },
  { keywords: ["farmacia", "drogasil", "droga raia", "hospital", "clinica", "consulta"], categoryTerms: ["saude", "medico"] },
  { keywords: ["aluguel", "condominio", "energia", "luz", "agua", "internet", "telefone"], categoryTerms: ["moradia", "casa", "contas"] },
  { keywords: ["salario", "holerite", "pagamento salario"], categoryTerms: ["salario", "renda"] },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function fallbackCategory(input: {
  description: string;
  kind: "income" | "expense";
  categories: CategoryOption[];
}): { categoryId: string | null; confidence: number } {
  const description = normalize(input.description);
  const categories = input.categories.filter((category) => category.kind === input.kind);
  let best: { categoryId: string; confidence: number } | null = null;

  for (const category of categories) {
    const categoryName = normalize(category.name);
    if (description.includes(categoryName) && categoryName.length >= 4) {
      best = { categoryId: category.id, confidence: 0.65 };
      continue;
    }

    for (const rule of RULES) {
      const keywordMatches = rule.keywords.some((keyword) => description.includes(normalize(keyword)));
      const categoryMatches = rule.categoryTerms.some((term) => categoryName.includes(normalize(term)));
      if (keywordMatches && categoryMatches && (!best || best.confidence < 0.55)) {
        best = { categoryId: category.id, confidence: 0.55 };
      }
    }
  }

  return best ?? { categoryId: null, confidence: 0 };
}