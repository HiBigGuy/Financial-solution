import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { isBackendReady } from "@/lib/supabase";
import { Mail, Lock, KeyRound, ArrowRight, Send, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-[10px] border border-border bg-surface-2 px-11 py-2.5 text-[13px] text-foreground placeholder:text-faint outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30";
const iconCls = "absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-faint pointer-events-none";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand px-5 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
const tabBtn = (active: boolean) =>
  cn(
    "flex-1 rounded-[8px] py-2 text-[12px] font-medium transition",
    active ? "bg-surface-2 text-foreground shadow-sm" : "text-faint hover:text-muted"
  );

export function LoginPage() {
  const { signIn, signUp, magicLink, session } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "magic">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (session) return <Navigate to="/dashboard" replace />;

  if (!isBackendReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-app px-4">
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 shadow-card text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-warning mb-4" />
          <h1 className="text-lg font-semibold text-foreground mb-2">
            Supabase não configurado
          </h1>
          <p className="text-[13px] text-muted leading-relaxed mb-5">
            Crie um arquivo <code className="rounded bg-surface-2 px-1.5 py-0.5 text-brand">.env</code> na raiz do projeto com suas credenciais do Supabase.
          </p>
          <pre className="rounded-xl bg-surface-2 p-4 text-left text-[11px] text-muted overflow-x-auto">
            {`VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima`}
          </pre>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSuccess(false);
    setLoading(true);
    let err: string | null = null;
    if (mode === "login") err = await signIn(email, password);
    else if (mode === "signup") err = await signUp(email, password, name || undefined);
    else {
      err = await magicLink(email);
      if (!err) setSuccess(true);
    }
    setMsg(err);
    setLoading(false);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-app px-4">
      <div className="w-full max-w-[380px] rounded-2xl border border-border bg-surface p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/15">
            <KeyRound className="h-5 w-5 text-brand" />
          </div>
          <h1 className="text-[17px] font-semibold text-foreground">Vault</h1>
          <p className="mt-1 text-[12px] text-muted">Acesse sua conta</p>
        </div>

        <div className="mb-5 flex gap-1 rounded-xl bg-surface-2 p-1">
          {(["login", "signup", "magic"] as const).map((m) => (
            <button key={m} className={tabBtn(mode === m)} onClick={() => { setMode(m); setMsg(null); setSuccess(false); }}>
              {m === "login" ? "Entrar" : m === "signup" ? "Conta" : "Mágico"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <div className="relative">
              <input className={inputCls} placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="relative">
            <Mail className={iconCls} />
            <input required type="email" className={inputCls} placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "magic" && (
            <div className="relative">
              <Lock className={iconCls} />
              <input
                required
                type="password"
                className={inputCls}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
          )}

          {success ? (
            <div className="rounded-xl border border-success/20 bg-success/10 p-3 text-center text-[12px] text-success">
              <Send className="mx-auto mb-1 h-4 w-4" />
              Link mágico enviado! Verifique sua caixa de entrada.
            </div>
          ) : null}

          {msg && !success && (
            <div className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-center text-[12px] text-danger">
              {msg}
            </div>
          )}

          <button type="submit" className={cn(btnPrimary, "w-full")} disabled={loading}>
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : mode === "magic" ? (
              <>
                Enviar link <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                {mode === "login" ? "Entrar" : "Criar conta"} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}