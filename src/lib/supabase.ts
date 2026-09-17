import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Cliente Supabase — retorna `null` quando as variáveis de ambiente não estão
 * configuradas. Isso permite que o app compile e mostre uma tela de aviso
 * sem depender de um projeto Supabase ao rodar localmente.
 */
export const supabase =
  url && key && !url.includes("SEU-PROJETO")
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

/** `true` quando o app não consegue conectar ao Supabase */
export const isBackendReady = supabase !== null;