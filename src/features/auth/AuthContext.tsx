import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name?: string) => Promise<string | null>;
  magicLink: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthCtx = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single<Profile>();
    if (data) setProfile(data);
  }, []);

  const ensureProfile = useCallback(
    async (userId: string, email?: string, name?: string) => {
      if (!supabase) return;
      await supabase.from("profiles").upsert(
        { id: userId, email: email ?? "", name: name ?? "" },
        { onConflict: "id" }
      );
      await fetchProfile(userId);
    },
    [fetchProfile]
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) fetchProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_e, s) => {
        setSession(s);
        if (s?.user) await fetchProfile(s.user.id);
        else setProfile(null);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return "Supabase não configurado.";
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error.message;
      return null;
    },
    []
  );

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      if (!supabase) return "Supabase não configurado.";
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return error.message;
      if (data.user) await ensureProfile(data.user.id, email, name);
      // Se confirmação por email estiver habilitada, `session` virá null
      const { data: sessionData } = await supabase.auth.getSession();
      if (data.user && !sessionData.session) {
        return "Conta criada! Confirme o e-mail enviado para poder entrar.";
      }
      return null;
    },
    [ensureProfile]
  );

  const magicLink = useCallback(async (email: string) => {
    if (!supabase) return "Supabase não configurado.";
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return error.message;
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signIn,
        signUp,
        magicLink,
        signOut,
        refreshProfile: () => fetchProfile(session!.user.id),
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}