import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Boxes, AlertTriangle, ShieldCheck, RefreshCw, Layers, Sliders, ChevronRight } from "lucide-react";

import {
  DataTable,
  PageHeader,
  Panel,
  StatusPill,
  num,
  usd,
} from "@/components/scm/primitives";
import { Button } from "@/components/ui/button";
import { createReplenishment } from "@/lib/scm/scm.functions";
import { inventoryQuery, purchaseOrdersQuery, sessionQuery } from "@/lib/scm/queries";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory Control — SUPPLYCHAINIQ" },
      {
        name: "description",
        content:
          "Inventory pressure matrix, stockout exposure, cover days, and automated purchase order replenishment.",
      },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(inventoryQuery),
      context.queryClient.ensureQueryData(purchaseOrdersQuery),
      context.queryClient.ensureQueryData(sessionQuery),
    ]);
  },
  component: InventoryPage,
});

const FILTERS = ["ALL", "STOCKOUT_RISK", "BELOW_REORDER", "HEALTHY", "EXCESS"] as const;

function InventoryPage() {
  const { data } = useSuspenseQuery(inventoryQuery);
  const { data: pos } = useSuspenseQuery(purchaseOrdersQuery);
  const { data: session } = useSuspenseQuery(sessionQuery);
  const queryClient = useQueryClient();
  const replenish = useServerFn(createReplenishment);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { inventoryPositionId: string; quantityUnits: number }) =>
      replenish({ data: input }),
    onSuccess: (res) => {
      queryClient.invalidateQueries();
      toast.success(
        `${res.poNumber} raised for ${num(res.quantityUnits)} units · ${usd(res.totalValueUsd)}`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setPendingId(null),
  });

  const rows = filter === "ALL" ? data.rows : data.rows.filter((r) => r.status === filter);
  const s = data.summary;
  const selectedRow = rows.find((r) => r.id === selectedRowId) ?? rows[0];

  if (data.rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="INVENTORY CONTROL"
          subtitle="Operational stock health matrix & replenishment execution engine"
          actions={
            <Button asChild size="sm" className="gap-2 font-bold text-xs">
              <Link to="/data">
                <Boxes className="size-3.5" />
                Import Stock Positions
              </Link>
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center gap-4">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Boxes className="size-6" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="font-semibold text-foreground text-base">No Stock Positions Found</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Import inventory positions for your facility nodes (site codes) to view cover health, stockout exposures, and automated replenishment.
            </p>
          </div>
          <Button asChild className="gap-2 font-bold text-xs mt-2">
            <Link to="/data">
              Import Stock Positions
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="INVENTORY CONTROL"
        subtitle="Operational stock health matrix & replenishment execution engine"
      />

      {/* 1. TOP METRICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">TOTAL STOCK VALUE</span>
          <span className="num text-xl font-bold text-foreground mt-1 block">{usd(s.totalValueUsd, { compact: true })}</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">{num(data.rows.reduce((acc: number, r: { onHand: number }) => acc + r.onHand, 0))} units on hand</span>
        </div>

        <div className="rounded border border-amber-300 bg-amber-50/70 p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-amber-900 uppercase font-mono block">REPLENISHMENT EXPOSURE</span>
          <span className="num text-xl font-bold text-amber-950 mt-1 block">{usd(s.exposureUsd, { compact: true })}</span>
          <span className="text-[11px] text-amber-800 mt-1 block font-bold font-mono">
            {num(s.belowReorder)} below reorder · {num(s.stockoutRisk)} below safety stock
          </span>
        </div>

        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">AVERAGE COVER DAYS</span>
          <span className="num text-xl font-bold text-foreground mt-1 block">{num(s.avgCoverDays, 1)} Days</span>
          <span className="text-[11px] text-teal-700 mt-1 block font-bold font-mono">{num(s.healthy)} healthy positions</span>
        </div>

        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">EXCESS CAPITAL</span>
          <span className="num text-xl font-bold text-foreground mt-1 block">{usd(s.excessValueUsd, { compact: true })}</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">{num(s.excess)} SKUs overstocked</span>
        </div>
      </div>

      {/* 2. INVENTORY PRESSURE MATRIX / HEATMAP */}
      <Panel
        title="INVENTORY PRESSURE MATRIX"
        description="Heatmap view of SKU cover health across operational facility sites"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 p-2 font-mono">
          {data.rows.slice(0, 12).map((r) => {
            const isCritical = r.status === "STOCKOUT_RISK" || r.status === "BELOW_REORDER";
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRowId(r.id)}
                className={`cursor-pointer rounded p-3 border transition-all text-xs ${isCritical
                  ? "bg-amber-950/90 border-amber-600 text-amber-100 hover:border-amber-400 shadow-md"
                  : r.status === "EXCESS"
                    ? "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                    : "bg-slate-900 border-teal-800 text-teal-200 hover:border-teal-500"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px]">{r.sku}</span>
                  <span className="text-[9px] text-slate-400">{r.siteCode}</span>
                </div>
                <div className="mt-2 text-sm font-bold">{num(r.coverDays, 1)}d</div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">{r.productName}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 3. DENSE OPERATIONAL TABLE & DETAIL PANEL */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Panel
          title="CRITICAL POSITIONS"
          description={session.canWrite ? "Click row to view detail drawer or raise replenishment PO" : "Read-only access"}
          className="xl:col-span-8"
          actions={
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded px-2.5 py-1 text-[10px] font-mono font-bold uppercase transition-all ${filter === f
                    ? "border border-primary bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {f.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          }
        >
          <DataTable
            headers={[
              "SKU / PRODUCT",
              "SITE",
              "ON HAND",
              "REORDER",
              "COVER",
              "STATUS",
              "ACTION",
            ]}
          >
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelectedRowId(r.id)}
                className={`border-t border-border/60 cursor-pointer transition-colors ${selectedRowId === r.id ? "bg-primary/10 font-semibold" : "hover:bg-muted/40"
                  }`}
              >
                <td className="px-3.5 py-2.5">
                  <span className="num font-bold text-foreground text-xs font-mono">{r.sku}</span>
                  <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">{r.productName}</span>
                </td>
                <td className="px-3.5 py-2.5 font-mono text-xs text-muted-foreground">{r.siteCode}</td>
                <td className="num px-3.5 py-2.5 text-xs font-bold">{num(r.onHand)}</td>
                <td className="num px-3.5 py-2.5 text-xs text-muted-foreground">{num(r.reorderPoint)}</td>
                <td className="num px-3.5 py-2.5 text-xs font-bold">{num(r.coverDays, 1)} d</td>
                <td className="px-3.5 py-2.5">
                  <StatusPill value={r.status} />
                </td>
                <td className="px-3.5 py-2.5">
                  {r.suggestedOrderUnits > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!session.canWrite || mutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingId(r.id);
                        mutation.mutate({
                          inventoryPositionId: r.id,
                          quantityUnits: r.suggestedOrderUnits,
                        });
                      }}
                      className="text-xs font-bold border-primary text-primary hover:bg-primary hover:text-primary-foreground h-7 px-2"
                    >
                      {pendingId === r.id && mutation.isPending ? "Raising..." : `Order ${num(r.suggestedOrderUnits)}`}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">—</span>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>

        {/* DETAIL SIDE PANEL FOR SELECTED ROW */}
        {selectedRow ? (
          <Panel title="POSITION DETAIL" description={`SKU: ${selectedRow.sku}`} className="xl:col-span-4">
            <div className="space-y-4 text-xs font-mono">
              <div className="rounded border border-border bg-muted/40 p-3 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">PRODUCT NAME</span>
                <p className="font-bold text-foreground text-sm">{selectedRow.productName}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">{selectedRow.siteCode} · Category {selectedRow.category}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded border border-border bg-card p-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">ON HAND UNITS</span>
                  <p className="font-bold text-foreground text-base mt-0.5">{num(selectedRow.onHand)}</p>
                </div>
                <div className="rounded border border-border bg-card p-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">ON ORDER</span>
                  <p className="font-bold text-foreground text-base mt-0.5">{num(selectedRow.onOrder)}</p>
                </div>
              </div>

              <div className="rounded border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-primary uppercase font-bold">SUGGESTED REPLENISHMENT</span>
                  <span className="text-xs font-bold text-primary">{usd(selectedRow.valueUsd)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Raise PO for <span className="font-bold text-foreground">{num(selectedRow.suggestedOrderUnits)} units</span> to restore cover to safety threshold.
                </p>
                {selectedRow.suggestedOrderUnits > 0 && session.canWrite ? (
                  <Button
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() => {
                      setPendingId(selectedRow.id);
                      mutation.mutate({
                        inventoryPositionId: selectedRow.id,
                        quantityUnits: selectedRow.suggestedOrderUnits,
                      });
                    }}
                    className="w-full text-xs font-bold bg-primary text-primary-foreground mt-1"
                  >
                    Raise Purchase Order Now
                  </Button>
                ) : null}
              </div>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
