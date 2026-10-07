import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getVerifiedSession } from "@/integrations/supabase/session";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — SUPPLYCHAINIQ" },
      {
        name: "description",
        content: "Sign in to the SUPPLYCHAINIQ supply chain decision intelligence command center.",
      },
      { property: "og:title", content: "Sign in — SUPPLYCHAINIQ" },
      {
        property: "og:description",
        content: "Access forecasts, stock health, supplier risk and shipment tracking.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    void getVerifiedSession().then((session) => {
      if (active && session) window.location.replace("/dashboard");
    });
    return () => { active = false; };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      document.cookie = "scm_active_ws=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "scm_explicit_ws=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, job_title: jobTitle },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.info("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.session) throw new Error("Supabase did not return an authenticated session.");
      }

      if (!(await getVerifiedSession())) {
        throw new Error("The Supabase session could not be verified. Please sign in again.");
      }

      toast.success(mode === "signup" ? "Account created and signed in!" : "Signed in successfully!");
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Activity className="size-5 text-primary" />
          <span className="font-display text-sm font-semibold tracking-[0.16em] text-foreground">
            SUPPLYCHAIN<span className="text-primary">IQ</span>
          </span>
        </div>

        <div className="panel p-6">
          <h1 className="text-lg font-semibold text-foreground">
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Access your enterprise supply chain decision command center."
              : "New accounts start with a dedicated, isolated workspace ready for CSV/XLSX import."}
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === "signup" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    autoComplete="name"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Supply Chain Manager"
                    autoComplete="organization-title"
                  />
                </div>
              </>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@company.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            <Button type="submit" disabled={pending} className="mt-1">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
            }}
            className="mt-5 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {mode === "signin"
              ? "No account yet? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
