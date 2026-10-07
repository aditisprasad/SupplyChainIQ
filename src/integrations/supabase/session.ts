import type { Session } from "@supabase/supabase-js";
import { supabase } from "./client";

function clearLegacyTokenCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "scm_token=; path=/; max-age=0; SameSite=Lax";
  }
}

function isAuthFailure(error: unknown) {
  const authError = error as { status?: number; message?: string } | null;
  return authError?.status === 400 || authError?.status === 401 || authError?.status === 403 ||
    /invalid jwt|signature|token.*expired|jwt.*expired/i.test(authError?.message ?? "");
}

async function verifySession(session: Session) {
  const { data, error } = await supabase.auth.getUser(session.access_token);
  return error ? { session: null, error } : { session: data.user ? session : null, error: null };
}

export async function getVerifiedSession(): Promise<Session | null> {
  clearLegacyTokenCookie();

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    return null;
  }

  const session = data.session;
  if (!session) return null;

  const current = await verifySession(session);
  if (current.session) return current.session;
  if (current.error && !isAuthFailure(current.error)) return null;

  const refreshed = await supabase.auth.refreshSession({ refresh_token: session.refresh_token });
  if (refreshed.data.session) {
    const verified = await verifySession(refreshed.data.session);
    if (verified.session) return verified.session;
    if (verified.error && !isAuthFailure(verified.error)) return null;
  } else if (refreshed.error && !isAuthFailure(refreshed.error)) {
    return null;
  }

  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  return null;
}