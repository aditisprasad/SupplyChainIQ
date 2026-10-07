import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Download, PackageCheck } from "lucide-react";

import {
  DataTable,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  PageSkeleton,
  Panel,
  StatusPill,
  dateLabel,
  num,
  usd,
} from "@/components/scm/primitives";
import { Button } from "@/components/ui/button";
import { exportCsv, receivePo } from "@/lib/scm/scm.functions";
import { purchaseOrdersQuery, sessionQuery } from "@/lib/scm/queries";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Exports — SUPPLYCHAINIQ" },
      {
        name: "description",
        content:
          "Receive purchase orders and export inventory, supplier, shipment and forecast datasets as spreadsheets.",
      },
      { property: "og:title", content: "Reports & Exports — SUPPLYCHAINIQ" },
      {
        property: "og:description",
        content: "Purchase order receiving and one-click CSV extracts of every operational dataset.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(purchaseOrdersQuery),
      context.queryClient.ensureQueryData(sessionQuery),
    ]);
  },
  component: ReportsPage,
  pendingComponent: () => <PageSkeleton kpis={4} panels={2} />,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} />,
  notFoundComponent: () => <EmptyState title="Nothing to report on yet" />,
});

const DATASETS = [
  { key: "inventory", label: "Stock positions", hint: "Cover days, status, value" },
  { key: "suppliers", label: "Supplier scorecard", hint: "Risk, quality, spend" },
  { key: "shipments", label: "Shipments", hint: "Lanes, delays, freight cost" },
  { key: "purchase_orders", label: "Purchase orders", hint: "Status and committed value" },
  { key: "forecast_accuracy", label: "Forecast accuracy", hint: "MAPE and bias by SKU" },
  { key: "alerts", label: "Alert log", hint: "Every exception raised" },
] as const;

type DatasetKey = (typeof DATASETS)[number]["key"];

const PO_FILTERS = ["ALL", "OPEN", "IN_TRANSIT", "RECEIVED", "DELAYED"] as const;

function ReportsPage() {
  const { data: pos } = useSuspenseQuery(purchaseOrdersQuery);
  const { data: session } = useSuspenseQuery(sessionQuery);
  const queryClient = useQueryClient();
  const runExport = useServerFn(exportCsv);
  const runReceive = useServerFn(receivePo);
  const [filter, setFilter] = useState<(typeof PO_FILTERS)[number]>("ALL");
  const [busyDataset, setBusyDataset] = useState<DatasetKey | null>(null);
  const [busyPo, setBusyPo] = useState<string | null>(null);

  const exportMutation = useMutation({
    mutationFn: (dataset: DatasetKey) => runExport({ data: { dataset } }),
    onSuccess: (res) => {
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${res.filename} downloaded`, { description: `${res.rowCount} rows` });
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setBusyDataset(null),
  });

  const receiveMutation = useMutation({
    mutationFn: (purchaseOrderId: string) => runReceive({ data: { purchaseOrderId } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["scm"] });
      toast.success(`${res.poNumber} received`, {
        description: `${res.unitsReceived.toLocaleString("en-US")} units moved into on-hand stock`,
      });
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setBusyPo(null),
  });

  const open = pos.filter((p) => p.status !== "RECEIVED");
  const committed = open.reduce((a, p) => a + p.totalValueUsd, 0);
  const receivedValue = pos.filter((p) => p.status === "RECEIVED").reduce((a, p) => a + p.totalValueUsd, 0);
  const late = open.filter((p) => new Date(p.promisedDate) < new Date()).length;
  const rows = filter === "ALL" ? pos : pos.filter((p) => p.status === filter);

  return (
    <>
      <PageHeader
        title="Reports & Exports"
        subtitle="Close out inbound purchase orders and pull any operational dataset as a spreadsheet."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Open purchase orders" value={num(open.length)} hint={`${pos.length} total`} />
        <KpiCard label="Committed spend" value={usd(committed)} hint="Not yet received" />
        <KpiCard label="Received to date" value={usd(receivedValue)} hint="Closed orders" />
        <KpiCard
          label="Past promised date"
          value={num(late)}
          hint="Needs supplier follow-up"
          tone={late > 0 ? "warning" : "success"}
        />
      </div>

      <Panel
        title="Dataset exports"
        description="Generated on the server from live workspace data, not a cached snapshot."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DATASETS.map((d) => (
            <div key={d.key} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{d.label}</p>
                <p className="truncate text-xs text-muted-foreground">{d.hint}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                disabled={busyDataset === d.key}
                onClick={() => {
                  setBusyDataset(d.key);
                  exportMutation.mutate(d.key);
                }}
              >
                <Download className="size-3.5" />
                {busyDataset === d.key ? "…" : "CSV"}
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="Purchase orders"
        description={
          session.canWrite
            ? "Receiving an order closes it and moves the units from on-order into on-hand stock."
            : "Your roles are read-only, so receiving is disabled."
        }
        actions={
          <div className="flex flex-wrap gap-1.5">
            {PO_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${filter === f
                    ? "border-primary/40 bg-primary/12 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                  }`}
              >
                {f.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No purchase orders match this filter"
            description="Try another status, or raise a replenishment order from Stock Health."
          />
        ) : (
          <DataTable
            headers={[
              "PO",
              "Supplier",
              "Site",
              "Status",
              "Ordered",
              "Promised",
              "Received",
              "Value",
              "",
            ]}
          >
            {rows.slice(0, 60).map((p) => (
              <tr key={p.id} className="border-t border-border/60">
                <td className="num px-3 py-2 text-foreground">{p.poNumber}</td>
                <td className="px-3 py-2">{p.supplierName}</td>
                <td className="num px-3 py-2">{p.siteCode}</td>
                <td className="px-3 py-2">
                  <StatusPill value={p.status} />
                </td>
                <td className="num px-3 py-2">{dateLabel(p.orderDate)}</td>
                <td className="num px-3 py-2">{dateLabel(p.promisedDate)}</td>
                <td className="num px-3 py-2">
                  {p.receivedDate ? dateLabel(p.receivedDate) : "—"}
                </td>
                <td className="num px-3 py-2 text-right text-foreground">{usd(p.totalValueUsd)}</td>
                <td className="px-3 py-2 text-right">
                  {p.status === "RECEIVED" ? null : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={!session.canWrite || busyPo === p.id}
                      onClick={() => {
                        setBusyPo(p.id);
                        receiveMutation.mutate(p.id);
                      }}
                    >
                      <PackageCheck className="size-3.5" />
                      {busyPo === p.id ? "Receiving…" : "Receive"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </>
  );
}
