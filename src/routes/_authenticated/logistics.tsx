import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Truck, ArrowRight, Clock, AlertTriangle, CheckCircle2, Navigation, Layers, Radio } from "lucide-react";

import {
  DataTable,
  PageHeader,
  Panel,
  StatusPill,
  dateLabel,
  num,
  pct,
  usd,
} from "@/components/scm/primitives";
import { Button } from "@/components/ui/button";
import { logisticsQuery } from "@/lib/scm/queries";

export const Route = createFileRoute("/_authenticated/logistics")({
  head: () => ({
    meta: [
      { title: "Logistics Control Tower — SUPPLYCHAINIQ" },
      {
        name: "description",
        content:
          "Inbound shipment records, transit status, delay hotspots, carrier on-time arrival rates, and lane freight spend.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(logisticsQuery),
  component: LogisticsPage,
});

const FILTERS = ["ALL", "DELAYED", "IN_TRANSIT", "DELIVERED"] as const;

function LogisticsPage() {
  const { data } = useSuspenseQuery(logisticsQuery);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");

  const s = data.summary;
  const rows = filter === "ALL" ? data.rows : data.rows.filter((r) => r.status === filter);

  const laneChart = data.lanes.slice(0, 8).map((l) => ({
    name: l.lane,
    spend: l.freightSpendUsd,
    otif: l.otifPct,
  }));

  if (data.rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="LOGISTICS CONTROL TOWER"
          subtitle="Inbound shipment telemetry & transit route delay intelligence"
          actions={
            <Button asChild size="sm" className="gap-2 font-bold text-xs">
              <Link to="/data">
                <Truck className="size-3.5" />
                Import Shipments
              </Link>
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center gap-4">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Truck className="size-6" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="font-semibold text-foreground text-base">No Shipments Found</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Import shipment records with carrier, mode, lane, ship date, and ETA to enable transit telemetry.
            </p>
          </div>
          <Button asChild className="gap-2 font-bold text-xs mt-2">
            <Link to="/data">Import Shipment Data</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="LOGISTICS CONTROL TOWER"
        subtitle="Inbound shipment telemetry & transit route delay intelligence"
      />

      {/* 1. TOP METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded border border-primary/40 bg-primary/5 p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-primary uppercase font-mono block">IN TRANSIT FREIGHT</span>
          <span className="num text-xl font-bold text-primary mt-1 block">{num(s.inTransit)} Shipments</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">{num(s.unitsInTransit)} units moving</span>
        </div>

        <div className="rounded border border-amber-300 bg-amber-50/70 p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-amber-900 uppercase font-mono block">DELAYED SHIPMENTS</span>
          <span className="num text-xl font-bold text-amber-950 mt-1 block">{num(s.delayed)} Delayed</span>
          <span className="text-[11px] text-amber-800 mt-1 block font-bold font-mono">+{num(s.avgDelayDays)} days avg slip</span>
        </div>

        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">ON-TIME IN-FULL (OTIF)</span>
          <span className="num text-xl font-bold text-teal-700 mt-1 block">{pct(s.otifPct)}</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">{num(s.delivered)} completed</span>
        </div>

        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">TOTAL FREIGHT SPEND</span>
          <span className="num text-xl font-bold text-foreground mt-1 block">{usd(s.freightSpendUsd, { compact: true })}</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">{usd(s.avgCostPerUnitUsd)} / unit avg</span>
        </div>
      </div>

      {/* 2. SHIPMENT STATUS SUMMARY */}
      <Panel title="SHIPMENT STATUS SUMMARY" description="Counts are calculated from shipment records in the current workspace">
        <div className="rounded bg-slate-950 p-5 border border-slate-800 text-slate-100 font-mono space-y-4">
          <div className="flex justify-between text-xs font-bold border-b border-slate-800 pb-2">
            <span>SHIPMENT RECORDS</span>
            <span className="text-teal-400 font-bold">{num(s.totalShipments)} TOTAL</span>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center my-3">
            <div className="rounded bg-slate-900 p-3 border border-slate-700">
              <span className="text-[10px] text-slate-400 block">IN TRANSIT</span>
              <span className="text-xs font-bold text-white mt-1 block">{num(s.inTransit)} shipments</span>
            </div>
            <div className="rounded bg-slate-900 p-3 border border-primary/50">
              <span className="text-[10px] text-primary block">UNITS IN TRANSIT</span>
              <span className="text-xs font-bold text-primary mt-1 block">{num(s.unitsInTransit)} units</span>
            </div>
            <div className="rounded bg-slate-900 p-3 border border-amber-600">
              <span className="text-[10px] text-amber-400 block">DELAYED</span>
              <span className="text-xs font-bold text-amber-300 mt-1 block">{num(s.delayed)} shipments</span>
            </div>
            <div className="rounded bg-slate-900 p-3 border border-slate-700">
              <span className="text-[10px] text-slate-400 block">DELIVERED</span>
              <span className="text-xs font-bold text-teal-400 mt-1 block">{num(s.delivered)} shipments</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* 3. DELAY HOTSPOTS & MODE MIX */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Panel title="Freight Spend by Lane" description="Highest volume inbound logistics lanes" className="xl:col-span-8">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={laneChart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} width={48} />
                <Tooltip
                  contentStyle={{
                    background: "#171A1D",
                    border: "1px solid #252A2E",
                    color: "#F8F7F5",
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Transport Mode Breakdown" description="Inbound spend & volume split" className="xl:col-span-4">
          <div className="space-y-3 font-mono text-xs">
            {data.modes.map((m) => (
              <div key={m.mode} className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border">
                <span className="font-bold text-foreground">{m.mode.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">{num(m.shipments)} SHP · {usd(m.freightSpendUsd, { compact: true })}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* 4. SHIPMENTS OPERATIONAL TABLE */}
      <Panel
        title="SHIPMENT EXECUTION CONSOLE"
        description="Filter by operational status or investigate delayed freight lanes"
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
            "SHIPMENT / PO",
            "LANE",
            "CARRIER",
            "ETA",
            "SLIP",
            "UNITS",
            "FREIGHT COST",
            "STATUS",
          ]}
        >
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/60 hover:bg-muted/40 transition-colors">
              <td className="px-3.5 py-2.5">
                <span className="num font-bold text-foreground text-xs font-mono">{r.ref}</span>
                <span className="block text-[11px] text-muted-foreground font-mono">{r.poNumber} · {r.supplierName}</span>
              </td>
              <td className="px-3.5 py-2.5 font-mono text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{r.lane}</span>
                <span className="block text-[10px]">{r.origin} → {r.destination}</span>
              </td>
              <td className="px-3.5 py-2.5 font-mono text-xs text-muted-foreground">
                <span>{r.carrier}</span>
                <span className="block text-[10px] uppercase">{r.mode.replace(/_/g, " ")}</span>
              </td>
              <td className="num px-3.5 py-2.5 text-xs text-muted-foreground font-mono">{dateLabel(r.etaDate)}</td>
              <td className={`num px-3.5 py-2.5 text-xs font-mono font-bold ${r.delayDays > 0 ? "text-amber-800" : "text-teal-700"}`}>
                {r.delayDays > 0 ? `+${num(r.delayDays)}d` : `${num(r.delayDays)}d`}
              </td>
              <td className="num px-3.5 py-2.5 text-xs font-bold font-mono">{num(r.units)}</td>
              <td className="num px-3.5 py-2.5 text-xs font-mono">
                <span className="font-bold text-foreground">{usd(r.freightCostUsd)}</span>
                <span className="block text-[10px] text-muted-foreground">{usd(r.costPerUnitUsd)}/u</span>
              </td>
              <td className="px-3.5 py-2.5">
                <StatusPill value={r.status} />
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}
