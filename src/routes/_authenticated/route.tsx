import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { AppShell } from "@/components/scm/shell";
import { getVerifiedSession } from "@/integrations/supabase/session";
import { sessionQuery } from "@/lib/scm/queries";
import { PageSkeleton } from "@/components/scm/primitives";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getVerifiedSession();
    if (!session) throw redirect({ to: "/auth" });
    return { user: { id: session.user.id } };
  },
  loader: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(sessionQuery);
    } catch {
      // Session and data queries expose their own error states when unavailable.
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: session, isLoading } = useQuery(sessionQuery);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="size-3 rounded-full bg-primary animate-ping" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Initializing Control Tower...
            </span>
          </div>
          <PageSkeleton kpis={4} panels={2} />
        </div>
      </div>
    );
  }

  return (
    <AppShell session={session}>
      <Suspense fallback={<PageSkeleton />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}
