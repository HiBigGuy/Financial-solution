import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Hook genérico para buscar linhas de uma tabela Supabase.
 * Retorna `data`, `loading`, `error` e `refetch`.
 */
export function useRows<T extends object>(
  table: string,
  opts?: {
    columns?: string;
    orderBy?: { column: string; ascending?: boolean };
    filters?: Record<string, unknown>;
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const columns = opts?.columns;
  const orderByKey = JSON.stringify(opts?.orderBy ?? null);
  const filtersKey = JSON.stringify(opts?.filters ?? null);

  const fetch = useCallback(async () => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    let q = client.from(table).select(columns ?? "*");
    const filters = JSON.parse(filtersKey) as Record<string, unknown> | null;
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined && v !== null && v !== "") q = q.eq(k, v);
      }
    }
    const orderBy = JSON.parse(orderByKey) as { column: string; ascending?: boolean } | null;
    if (orderBy) {
      q = q.order(orderBy.column, {
        ascending: orderBy.ascending ?? false,
      });
    }
    const { data: rows, error: err } = await q;
    if (err) setError(err.message);
    else setData((rows ?? []) as unknown as T[]);
    setLoading(false);
  }, [table, columns, orderByKey, filtersKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}