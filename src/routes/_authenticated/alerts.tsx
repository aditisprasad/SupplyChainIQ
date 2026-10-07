import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import {
  KpiCard,
  PageHeader,
  Panel,
  StatusPill,
  dateLabel,
  num,
  usd,
} from "@/components/scm/primitives";
import { Button } from "@/components/ui/button";
import { alertsQuery, sessionQuery } from "@/lib/scm/queries";
import { updateAlertStatus } from "@/lib/scm/scm.functions";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alert Desk — SUPPLYCHAINIQ" },
      {
        name: "description",
        content:
          "Triage supply chain exceptions across demand, inventory, suppliers and logistics with financial impact and acknowledgement trail.",
      },
      { property: "og:title", content: "Alert Desk — SUPPLYCHAINIQ" },
      {
        property: "og:description",
        content: "Acknowledge and resolve exceptions ranked by severity and value at risk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(alertsQuery),
      context.queryClient.ensureQueryData(sessionQuery),
    ]);
  },
  component: AlertsPage,
});

const STATUSES = ["ALL", "OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;
const MODULES = ["ALL", "DEMAND", "INVENTORY", "SUPPLIER", "LOGISTICS"] as const;

function AlertsPage() {
  const { data: alerts } = useSuspenseQuery(alertsQuery);
  const { data: session } = useSuspenseQuery(sessionQuery);
  const queryClient = useQueryClient();
  const setStatus = useServerFn(updateAlertStatus);
  const [status, setStatusFilter] = useState<(typeof STATUSES)[number]>("ALL");
  const [module, setModule] = useState<(typeof MODULES)[number]>("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { alertId: string; status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" }) =>
      setStatus({ data: input }),
    onSuccess: (_res, input) => {
      queryClient.invalidateQueries();
      toast.success(`Alert marked ${input.status.toLowerCase()}`);
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setPendingId(null),
  });

  const rows = alerts.filter(
    (a) =>
      (status === "ALL" || a.status === status) &&
      (module === "ALL" || a.module.toUpperCase() === module),
  );

  const open = alerts.filter((a) => a.status === "OPEN");
  const critical = open.filter((a) => a.severity === "CRITICAL");
  const impact = open.reduce((sum, a) => sum + (a.impactUsd ?? 0), 0);

  function act(id: string, next: "OPEN" | "ACKNOWLEDGED" | "RESOLVED") {
    setPendingId(id);
    mutation.mutate({ alertId: id, status: next });
  }

  if (alerts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Alert Desk"
          subtitle="Exceptions raised by the intelligence modules, ranked by severity and value at risk"
        />
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center gap-4">
          <div className="size-12 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600">
            <span className="text-2xl">✓</span>
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="font-semibold text-foreground text-base">No Alerts Recorded</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The current workspace has no persisted alert records.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Alert Desk"
        subtitle="Exceptions raised by the intelligence modules, ranked by severity and value at risk"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open alerts" value={num(open.length)} hint={`${num(alerts.length)} total`} tone="primary" />
        <KpiCard
          label="Critical"
          value={num(critical.length)}
          hint="Require immediate action"
          tone={critical.length > 0 ? "danger" : "success"}
        />
        <KpiCard label="Value at risk" value={usd(impact, { compact: true })} hint="Open alerts only" tone="warning" />
        <KpiCard
          label="Resolved"
          value={num(alerts.filter((a) => a.status === "RESOLVED").length)}
          hint="Closed by the team"
          tone="success"
        />
      </div>

      <Panel
        className="mt-4"
        title="Exception queue"
        description={
          session.canWrite
            ? "Acknowledge to take ownership, resolve once the countermeasure is in place"
            : "Your roles allow read-only access to the queue"
        }
        actions={
          <div className="flex flex-wrap gap-1">
            {STATUSES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-1">
          {MODULES.map((m) => (
            <Button
              key={m}
              size="sm"
              variant={module === m ? "secondary" : "ghost"}
              onClick={() => setModule(m)}
            >
              {m === "ALL" ? "All modules" : m.charAt(0) + m.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No alerts match this filter.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-border bg-card/60 p-3 transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill value={a.severity} />
                      <StatusPill value={a.status} />
                      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {a.module}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">{a.title}</p>
                    {a.detail ? (
                      <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
                    ) : null}
                    <p className="num mt-2 text-xs text-muted-foreground">
                      Raised {dateLabel(a.createdAt)}
                      {a.impactUsd != null ? ` · impact ${usd(a.impactUsd)}` : ""}
                      {a.acknowledgedAt ? ` · acknowledged ${dateLabel(a.acknowledgedAt)}` : ""}
                    </p>
                  </div>

                  {session.canWrite ? (
                    <div className="flex shrink-0 gap-2">
                      {a.status === "OPEN" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingId === a.id}
                          onClick={() => act(a.id, "ACKNOWLEDGED")}
                        >
                          Acknowledge
                        </Button>
                      ) : null}
                      {a.status !== "RESOLVED" ? (
                        <Button size="sm" disabled={pendingId === a.id} onClick={() => act(a.id, "RESOLVED")}>
                          Resolve
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingId === a.id}
                          onClick={() => act(a.id, "OPEN")}
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
