import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Factory, ShieldAlert, DollarSign, Activity, AlertTriangle, Layers, ChevronRight } from "lucide-react";

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
import { suppliersQuery } from "@/lib/scm/queries";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({
    meta: [
      { title: "Supplier Network — SUPPLYCHAINIQ" },
      {
        name: "description",
        content:
          "Composite supplier risk network, OTIF delivery compliance, quality PPM defect rates, spend exposure, and contract expiry tracking.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(suppliersQuery),
  component: SuppliersPage,
});

const BANDS = ["ALL", "SEVERE", "HIGH", "MODERATE", "LOW"] as const;

const BAND_FILL: Record<string, string> = {
  SEVERE: "#DC2626",
  HIGH: "#D96B27",
  MODERATE: "#0F766E",
  LOW: "#16A34A",
};

function SuppliersPage() {
  const { data } = useSuspenseQuery(suppliersQuery);
  const [band, setBand] = useState<(typeof BANDS)[number]>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const s = data.summary;
  const rows = band === "ALL" ? data.rows : data.rows.filter((r) => r.riskBand === band);
  const selected = data.rows.find((r) => r.id === selectedId) ?? data.rows[0];

  if (data.rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="SUPPLIER NETWORK"
          subtitle="Multi-tier vendor risk intelligence & spend exposure matrix"
          actions={
            <Button asChild size="sm" className="gap-2 font-bold text-xs">
              <Link to="/data">
                <Factory className="size-3.5" />
                Import Suppliers
              </Link>
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center gap-4">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Factory className="size-6" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="font-semibold text-foreground text-base">No Suppliers Found</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Import supplier scorecards with lead time, OTIF %, defect PPM, and annual spend to generate vendor risk profiles.
            </p>
          </div>
          <Button asChild className="gap-2 font-bold text-xs mt-2">
            <Link to="/data">
              Import Supplier Scorecards
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const chartData = data.rows.slice(0, 10).map((r) => ({
    name: r.code,
    risk: r.riskScore,
    band: r.riskBand,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="SUPPLIER NETWORK"
        subtitle="Multi-tier vendor risk intelligence & spend exposure matrix"
      />

      {/* 1. TOP METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">SCORED SUPPLIERS</span>
          <span className="num text-xl font-bold text-foreground mt-1 block">{num(s.supplierCount)} Vendors</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">{num(s.contractsExpiring12m)} expiring in 12m</span>
        </div>

        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">TOTAL ANNUAL SPEND</span>
          <span className="num text-xl font-bold text-foreground mt-1 block">{usd(s.totalSpendUsd, { compact: true })}</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">Multi-tier procurement</span>
        </div>

        <div className="rounded border border-amber-300 bg-amber-50/70 p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-amber-900 uppercase font-mono block">EXPOSED SPEND AT RISK</span>
          <span className="num text-xl font-bold text-amber-950 mt-1 block">{usd(s.spendAtRiskUsd, { compact: true })}</span>
          <span className="text-[11px] text-amber-800 mt-1 block font-bold font-mono">{num(s.highRiskCount)} vendors high/severe</span>
        </div>

        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">WEIGHTED OTIF RATE</span>
          <span className="num text-xl font-bold text-teal-700 mt-1 block">{pct(s.avgOtifPct)}</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">{num(s.avgDefectPpm)} avg PPM defects</span>
        </div>
      </div>

      {/* 2. SUPPLIER NETWORK NODE GRAPH VISUALIZATION */}
      <Panel title="SUPPLIER NETWORK TOPOLOGY NODE GRAPH" description="Node size represents spend exposure; node status color indicates composite risk rating">
        <div className="rounded bg-slate-950 p-5 border border-slate-800 text-slate-100 font-mono">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {data.rows.slice(0, 12).map((r) => {
              const isHigh = r.riskBand === "SEVERE" || r.riskBand === "HIGH";
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`cursor-pointer rounded p-3 border transition-all text-xs ${selected?.id === r.id ? "ring-2 ring-primary" : ""
                    } ${isHigh
                      ? "bg-amber-950/80 border-amber-600 text-amber-100 hover:border-amber-400"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:border-teal-500"
                    }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-white">{r.code}</span>
                    <span className="text-slate-400">T{r.tier}</span>
                  </div>
                  <p className="font-bold text-xs truncate mt-1 text-slate-100">{r.name}</p>
                  <div className="mt-2 flex justify-between items-center text-[10px]">
                    <span className="font-bold text-teal-400">{usd(r.annualSpendUsd, { compact: true })}</span>
                    <span className={`font-bold ${isHigh ? "text-amber-400" : "text-slate-400"}`}>{r.riskScore}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* 3. SUPPLIER SCORECARD & PROFILE DRAWER */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Panel
          title="SUPPLIER SCORECARD TABLE"
          description="Click a row to inspect full risk breakdown"
          className="xl:col-span-8"
          actions={
            <div className="flex flex-wrap gap-1">
              {BANDS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBand(b)}
                  className={`rounded px-2.5 py-1 text-[10px] font-mono font-bold uppercase transition-all ${band === b
                    ? "border border-primary bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {b}
                </button>
              ))}
            </div>
          }
        >
          <DataTable
            headers={[
              "SUPPLIER / CODE",
              "TIER",
              "REGION",
              "RISK SCORE",
              "OTIF",
              "DEFECTS (PPM)",
              "SPEND",
            ]}
          >
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`border-t border-border/60 cursor-pointer transition-colors ${selected?.id === r.id ? "bg-primary/10 font-semibold" : "hover:bg-muted/40"
                  }`}
              >
                <td className="px-3.5 py-2.5">
                  <span className="font-bold text-foreground text-xs">{r.name}</span>
                  <span className="block text-[11px] text-muted-foreground font-mono">{r.code} · {r.category}</span>
                </td>
                <td className="num px-3.5 py-2.5 font-mono text-xs text-muted-foreground">T{r.tier}</td>
                <td className="px-3.5 py-2.5 font-mono text-xs text-muted-foreground">{r.country}</td>
                <td className="px-3.5 py-2.5">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="num font-bold text-foreground text-xs">{r.riskScore}</span>
                    <StatusPill value={r.riskBand} />
                  </div>
                </td>
                <td className="num px-3.5 py-2.5 text-xs font-mono text-muted-foreground">{pct(r.onTimeDeliveryRate)}</td>
                <td className="num px-3.5 py-2.5 text-xs font-mono text-muted-foreground">{num(r.defectRatePpm)}</td>
                <td className="num px-3.5 py-2.5 text-xs font-mono font-bold text-foreground">
                  {usd(r.annualSpendUsd, { compact: true })}
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>

        {/* DETAILED SUPPLIER PROFILE DRAWER */}
        {selected ? (
          <Panel title="SUPPLIER PROFILE DRAWER" description={`${selected.code} · Tier ${selected.tier} · ${selected.country}`} className="xl:col-span-4">
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between p-3 rounded bg-muted/40 border border-border">
                <span className="font-bold text-foreground text-sm">{selected.name}</span>
                <StatusPill value={selected.riskBand} />
              </div>

              {/* Risk Breakdown Drivers */}
              <div className="space-y-2.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">COMPOSITE RISK DRIVERS</span>
                {[
                  { label: "Financial Risk", value: selected.financialRisk, weight: "35%" },
                  { label: "Geopolitical Risk", value: selected.geopoliticalRisk, weight: "35%" },
                  { label: "Capacity Risk", value: selected.capacityRisk, weight: "30%" },
                ].map((f) => (
                  <div key={f.label} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span>{f.label}</span>
                      <span className="font-bold">{f.value.toFixed(0)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(f.value, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div className="rounded bg-card p-2.5 border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase block">LEAD TIME</span>
                  <span className="font-bold text-foreground mt-0.5 block">{num(selected.leadTimeDays)} Days</span>
                </div>
                <div className="rounded bg-card p-2.5 border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase block">SOLE SOURCED</span>
                  <span className="font-bold text-foreground mt-0.5 block">{num(selected.soleSourcedSkus)} SKUs</span>
                </div>
              </div>
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
