import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Boxes,
  TrendingUp,
  Truck,
  AlertTriangle,
  Factory,
  Upload,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  Radio,
  Clock,
  Zap,
  Activity,
  ChevronRight,
  Layers,
} from "lucide-react";

import {
  DataTable,
  PageHeader,
  Panel,
  StatusPill,
  num,
  pct,
  usd,
  ErrorState,
  PageSkeleton,
} from "@/components/scm/primitives";
import { Button } from "@/components/ui/button";
import { overviewQuery, sessionQuery } from "@/lib/scm/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Control Tower — SUPPLYCHAINIQ" },
      {
        name: "description",
        content:
          "Workspace supply chain control tower: network topology, priority incidents, risk exposure, and decision intelligence.",
      },
    ],
  }),
  loader: async ({ context }) => {
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(sessionQuery),
        context.queryClient.ensureQueryData(overviewQuery),
      ]);
    } catch {
          // The component renders its query error state if these requests fail.
    }
  },
  component: Dashboard,
});

function ChartTooltip() {
  return (
    <Tooltip
      contentStyle={{
        background: "#171A1D",
        border: "1px solid #252A2E",
        borderRadius: 4,
        fontSize: 11,
        color: "#F8F7F5",
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      }}
    />
  );
}

function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery(overviewQuery);
  const { data: session } = useQuery(sessionQuery);

  if (isLoading) {
    return <PageSkeleton kpis={4} panels={2} />;
  }

  if (error) {
    return <ErrorState error={error as Error} onRetry={() => refetch()} />;
  }

  const k = data?.kpis;
  const topIncidents = data?.topIncidents ?? [];
  const demandTrend = data?.demandTrend ?? [];
  const topRiskSuppliers = data?.topRiskSuppliers ?? [];

  if (!data || !k || !data.hasData || (k.skuCount === 0 && k.supplierCount === 0 && k.inTransitShipments === 0)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="CONTROL TOWER"
          subtitle="Workspace operational command & supply chain decision intelligence center"
          actions={
            <Button asChild size="sm" className="gap-2 font-bold text-xs">
              <Link to="/data">
                <Upload className="size-3.5" />
                Ingest Workspace Data
              </Link>
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center gap-4">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Boxes className="size-6" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="font-semibold text-foreground text-base">Control Tower Ready for Data</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your customer workspace is isolated and ready. Ingest products, suppliers, inventory positions, or shipments to activate live telemetry and control tower analytics.
            </p>
          </div>
          <Button asChild className="gap-2 font-bold text-xs mt-2">
            <Link to="/data">
              <Upload className="size-4" />
              Import Data via CSV/XLSX
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE CONTROL TOWER HEADER STRIP */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="num text-[10px] font-bold text-primary font-mono tracking-wider uppercase">
                EXECUTIVE CONTROL TOWER
              </span>
              <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold font-mono text-teal-800 border border-teal-200">
                DATABASE QUERY OK
              </span>
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight text-foreground mt-0.5">
              Network Operational Command
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="gap-2 text-xs font-semibold">
              <Link to="/data">
                <Upload className="size-3.5" />
                Data Ingestion
              </Link>
            </Button>
            <Button asChild size="sm" className="gap-2 text-xs bg-primary text-primary-foreground font-bold">
              <Link to="/ai-decision">
                <Sparkles className="size-3.5" />
                Decision Room
              </Link>
            </Button>
          </div>
        </div>

        {/* Live Operational Health Bar */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="rounded bg-slate-900 p-2.5 text-slate-100 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">SYSTEM STATUS</span>
            <span className="text-teal-400 font-bold mt-0.5 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-teal-400 animate-pulse" />
              {data?.hasData ? "DATA AVAILABLE" : "NO OPERATIONAL DATA"}
            </span>
          </div>

          <div className="rounded bg-slate-900 p-2.5 text-slate-100 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">DATA FRESHNESS</span>
            <span className="text-slate-200 font-bold mt-0.5 flex items-center gap-1">
              <Clock className="size-3 text-primary" />
              LATEST DATABASE QUERY
            </span>
          </div>

          <div className="rounded bg-slate-900 p-2.5 text-slate-100 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">OPEN EXCEPTIONS</span>
            <span className="text-amber-400 font-bold mt-0.5 flex items-center gap-1">
              <AlertTriangle className="size-3" />
              {num(k.openAlerts)} ({num(k.criticalAlerts)} CRITICAL)
            </span>
          </div>

          <div className="rounded bg-slate-900 p-2.5 text-slate-100 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">EXPOSURE AT RISK</span>
            <span className="text-primary font-bold mt-0.5">
              {usd(k.alertImpactUsd, { compact: true })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. CENTER & RIGHT: GLOBAL NETWORK TOPOLOGY + PRIORITY INCIDENTS */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* CENTER: GLOBAL NETWORK TOPOLOGY (COL SPAN 8) */}
        <div className="lg:col-span-8 rounded-lg border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-primary" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                GLOBAL SUPPLY NETWORK TOPOLOGY
              </span>
            </div>
            <span className="num text-[10px] font-mono text-teal-400 font-bold bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
              {num(k.supplierCount)} SUPPLIERS · {num(k.skuCount)} SKUS
            </span>
          </div>

          {/* Network Node Chain */}
          <div className="relative my-2 rounded bg-slate-900 p-5 border border-slate-800 space-y-6">
            <div className="grid grid-cols-5 gap-2 text-center font-mono">
              <div className="rounded bg-slate-950 p-3 border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">SUPPLIERS</span>
                <span className="text-xs font-bold text-slate-200 mt-1 block">{num(k.supplierCount)} Nodes</span>
                <span className="text-[10px] text-amber-400 mt-1 block font-bold">{num(k.suppliersAtRisk)} At Risk</span>
              </div>

              <div className="rounded bg-slate-950 p-3 border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">FACTORIES</span>
                <span className="text-xs font-bold text-slate-200 mt-1 block">{num(k.factoryCount || k.siteCount)} {k.factoryCount ? "Fabs" : "Sites"}</span>
                <span className="text-[10px] text-teal-400 mt-1 block font-bold">{pct(k.otifPct)} OTIF</span>
              </div>

              <div className="rounded bg-slate-950 p-3 border border-primary/50">
                <span className="text-[10px] text-primary block font-bold">WAREHOUSES</span>
                <span className="text-xs font-bold text-white mt-1 block">{usd(k.inventoryValueUsd, { compact: true })}</span>
                <span className="text-[10px] text-amber-400 mt-1 block font-bold">{num(k.skusAtRisk)} SKUs Risk</span>
              </div>

              <div className="rounded bg-slate-950 p-3 border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">DISTRIBUTION</span>
                <span className="text-xs font-bold text-slate-200 mt-1 block">{num(k.inTransitShipments)} In Transit</span>
                <span className="text-[10px] text-slate-400 mt-1 block">{num(k.delayedShipments)} Delayed</span>
              </div>

              <div className="rounded bg-slate-950 p-3 border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">DEMAND</span>
                <span className="text-xs font-bold text-slate-200 mt-1 block">{pct(k.forecastAccuracyPct)} Acc</span>
                <span className="text-[10px] text-teal-400 mt-1 block font-bold">Bias {pct(k.forecastBiasPct)}</span>
              </div>
            </div>

          </div>

          {/* Operational Metrics Row */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-xs font-mono">
            <div className="rounded bg-slate-900 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Open PO Commit</span>
              <span className="text-sm font-bold text-slate-100 mt-0.5 block">{usd(k.openPoValueUsd, { compact: true })}</span>
            </div>
            <div className="rounded bg-slate-900 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Freight Spend</span>
              <span className="text-sm font-bold text-slate-100 mt-0.5 block">{usd(k.freightSpendUsd, { compact: true })}</span>
            </div>
            <div className="rounded bg-slate-900 p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Annual Revenue</span>
              <span className="text-sm font-bold text-teal-400 mt-0.5 block">{usd(k.annualRevenueUsd, { compact: true })}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: PRIORITY INCIDENTS FEED (COL SPAN 4) */}
        <div className="lg:col-span-4 rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-700" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                PRIORITY INCIDENTS
              </span>
            </div>
            <Link to="/alerts" className="text-[11px] font-bold text-primary hover:underline">
              View All ({num(k.openAlerts)})
            </Link>
          </div>

          <div className="space-y-3">
            {topIncidents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No open alerts in the current workspace dataset.</p>
            ) : (
              topIncidents.map((incident) => (
                <div
                  key={`${incident.module}-${incident.title}`}
                  className={`rounded border p-3.5 space-y-2 ${incident.severity === "CRITICAL"
                    ? "border-amber-300 bg-amber-50/70"
                    : "border-border bg-muted/30"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`num text-[10px] font-bold uppercase font-mono px-1.5 py-0.5 rounded ${incident.severity === "CRITICAL"
                        ? "text-amber-900 bg-amber-200/80"
                        : "text-foreground bg-muted border border-border"
                        }`}
                    >
                      {incident.severity} // {incident.module}
                    </span>
                    <span className="num text-xs font-bold font-mono">
                      {incident.impactUsd != null ? usd(incident.impactUsd, { compact: true }) : "—"}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground">{incident.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{incident.detail}</p>
                  <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold mt-1">
                    <Link to="/alerts">Investigate Incident</Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. CHARTS & WATCHLIST SECTION */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Panel
          title="Demand & Revenue Trend"
          description="Rolling shipped units vs. revenue volume"
          className="xl:col-span-8"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={demandTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="units" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} width={48} />
                {ChartTooltip()}
                <Area
                  type="monotone"
                  dataKey="units"
                  name="Units Shipped"
                  stroke="hsl(var(--primary))"
                  fill="url(#units)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Highest Risk Suppliers" description="Composite risk index derived from OTIF & PPM" className="xl:col-span-4">
          <DataTable headers={["Supplier", "Risk", "Band"]}>
            {topRiskSuppliers.slice(0, 5).map((s) => (
              <tr key={s.id} className="border-t border-border/60 hover:bg-muted/40 transition-colors">
                <td className="px-3 py-2 font-semibold text-foreground text-xs">{s.name}</td>
                <td className="num px-3 py-2 text-xs font-bold">{num(s.risk, 1)}</td>
                <td className="px-3 py-2">
                  <StatusPill value={s.band} />
                </td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>

      {/* 4. BOTTOM HORIZONTAL INTELLIGENCE STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
        <Link to="/inventory" className="rounded border border-border bg-card p-3 shadow-2xs hover:border-primary transition-all">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">INVENTORY</span>
          <span className="text-xs font-bold text-foreground mt-1 block">{usd(k.inventoryValueUsd, { compact: true })}</span>
        </Link>
        <Link to="/suppliers" className="rounded border border-border bg-card p-3 shadow-2xs hover:border-primary transition-all">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">SUPPLIER RISK</span>
          <span className="text-xs font-bold text-amber-700 mt-1 block">{num(k.suppliersAtRisk)} Vendors High</span>
        </Link>
        <Link to="/logistics" className="rounded border border-border bg-card p-3 shadow-2xs hover:border-primary transition-all">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">LOGISTICS</span>
          <span className="text-xs font-bold text-teal-700 mt-1 block">{num(k.inTransitShipments)} In Transit</span>
        </Link>
        <Link to="/demand" className="rounded border border-border bg-card p-3 shadow-2xs hover:border-primary transition-all">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">DEMAND</span>
          <span className="text-xs font-bold text-foreground mt-1 block">{pct(k.forecastAccuracyPct)} Accuracy</span>
        </Link>
        <Link to="/procurement" className="rounded border border-border bg-card p-3 shadow-2xs hover:border-primary transition-all">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">PROCUREMENT</span>
          <span className="text-xs font-bold text-foreground mt-1 block">{usd(k.openPoValueUsd, { compact: true })} Open</span>
        </Link>
      </div>
    </div>
  );
}
