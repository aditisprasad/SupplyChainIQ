import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { usd } from "@/components/scm/primitives";
import {
  Activity,
  Boxes,
  Factory,
  TrendingUp,
  Truck,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  DollarSign,
  CheckCircle2,
  Database,
  Sliders,
  Cpu,
  Globe,
  Layers,
  Zap,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  ArrowUpRight,
  Lock,
  RefreshCw,
  Bot,
  AlertTriangle,
  ChevronRight,
  Terminal,
  Radio,
  Clock,
  Crosshair,
  Compass,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SUPPLYCHAINIQ — Industrial Supply Chain Control Tower" },
      {
        name: "description",
        content:
          "Enterprise supply chain control tower for electronics manufacturing, connecting workspace demand, stock health, supplier risk, and logistics records.",
      },
      { property: "og:title", content: "SUPPLYCHAINIQ — Industrial Control Tower" },
      {
        property: "og:description",
        content:
          "See disruption before it becomes downtime. Unified decision intelligence for global manufacturing and procurement.",
      },
    ],
  }),
  component: IndustrialControlTowerLanding,
});

function IndustrialControlTowerLanding() {
  const [simDemandSurge, setSimDemandSurge] = useState(25);
  const [simLeadTimeDelay, setSimLeadTimeDelay] = useState(8);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20 selection:text-primary">
      {/* ========================================================= */}
      {/* CONTROL TOWER HEADER                                       */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/90 border-b border-border/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded bg-primary text-primary-foreground shadow-xs">
              <Activity className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-extrabold tracking-[0.18em] text-foreground">
                SUPPLYCHAIN<span className="text-primary">IQ</span>
              </span>
              <span className="num text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                CONTROL TOWER v4.2
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <a href="#control-hero" className="transition-colors hover:text-primary">
              Control Center
            </a>
            <a href="#global-network" className="transition-colors hover:text-primary">
              Global Network
            </a>
            <a href="#command-center" className="transition-colors hover:text-primary">
              Operations
            </a>
            <a href="#scenario-lab" className="transition-colors hover:text-primary">
              Scenario Lab
            </a>
            <a href="#data-pipeline" className="transition-colors hover:text-primary">
              Data Pipeline
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded bg-muted/60 px-2.5 py-1 border border-border text-[10px] font-mono text-muted-foreground">
              <Database className="size-3.5" />
              <span>WORKSPACE DATA AFTER SIGN-IN</span>
            </div>

            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center rounded border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-accent"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90"
            >
              <span>ENTER COMMAND CENTER</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 lg:px-10">
        {/* ========================================================= */}
        {/* SECTION 01: HERO — INDUSTRIAL CONTROL TOWER               */}
        {/* ========================================================= */}
        <section id="control-hero" className="py-12 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            {/* HERO LEFT COLUMN */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-bold text-primary">
                <Radio className="size-3.5 text-primary animate-pulse" />
                <span className="uppercase tracking-widest text-[10px] font-mono">
                  SUPPLY CHAIN DECISION INTELLIGENCE
                </span>
              </div>

              <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]">
                See disruption before it becomes downtime.
              </h1>

              <p className="text-base text-muted-foreground leading-relaxed max-w-xl">
                One operational intelligence layer connecting demand forecasts, inventory cover, supplier risk, procurement spend, and global logistics execution.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded bg-primary px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                >
                  <span>ENTER COMMAND CENTER</span>
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded border border-border bg-card px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground shadow-2xs transition-all hover:bg-accent"
                >
                  <span>OPEN WORKSPACE</span>
                </Link>
              </div>

              {/* Workspace data is shown after authentication. */}
              <div className="pt-4 grid grid-cols-3 gap-3 border-t border-border/80 text-xs">
                <div>
                  <p className="num text-[10px] text-muted-foreground font-bold uppercase">Access</p>
                  <p className="num text-xs font-bold text-foreground mt-0.5">Authenticated workspace</p>
                </div>
                <div>
                  <p className="num text-[10px] text-muted-foreground font-bold uppercase">Data</p>
                  <p className="num text-xs font-bold text-foreground mt-0.5">Workspace-scoped</p>
                </div>
                <div>
                  <p className="num text-[10px] text-muted-foreground font-bold uppercase">Storage</p>
                  <p className="num text-xs font-bold text-foreground mt-0.5">PostgreSQL</p>
                </div>
              </div>
            </div>

            {/* HERO RIGHT COLUMN — CONTROL TOWER NETWORK VISUALIZATION */}
            <div className="lg:col-span-6">
              <div className="relative rounded-xl border border-slate-700 bg-slate-950 p-5 shadow-2xl text-slate-100 overflow-hidden">
                {/* Visual Header Strip */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-300">
                    <Terminal className="size-4 text-primary" />
                    <span>NETWORK CONTROL TOWER // TOPOLOGY</span>
                  </div>
                  <span className="rounded bg-teal-950 border border-teal-800 px-2 py-0.5 num text-[10px] font-bold text-teal-400">
                    ILLUSTRATIVE NETWORK VIEW
                  </span>
                </div>

                {/* Network Flow Diagram (Suppliers -> Factory -> Warehouse -> Distribution -> Customer) */}
                <div className="relative my-4 h-72 w-full rounded bg-slate-900/90 p-4 border border-slate-800 flex flex-col justify-between overflow-hidden">
                  <div className="absolute inset-0 grid-backdrop opacity-20 pointer-events-none" />

                  {/* Connecting Flow Paths */}
                  <svg className="absolute inset-0 h-full w-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M 70 50 L 180 90" stroke="#D96B27" strokeWidth="2" strokeOpacity="0.6" className="animate-pulse-flow" />
                    <path d="M 180 90 L 290 50" stroke="#0F766E" strokeWidth="2" strokeOpacity="0.6" />
                    <path d="M 290 50 L 400 110" stroke="#D96B27" strokeWidth="2" strokeOpacity="0.6" className="animate-pulse-flow" />
                    <path d="M 400 110 L 280 180" stroke="#0F766E" strokeWidth="2" strokeOpacity="0.6" />
                    <path d="M 280 180 L 140 220" stroke="#D96B27" strokeWidth="2" strokeOpacity="0.6" className="animate-pulse-flow" />
                  </svg>

                  {/* Node Row 1 */}
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="rounded bg-slate-900 border border-slate-700 p-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-slate-300">
                        <Factory className="size-3.5 text-primary" />
                        <span>SUPPLIERS</span>
                      </div>
                      <p className="num text-[10px] text-slate-400 mt-1 font-mono">Supplier records</p>
                    </div>

                    <div className="rounded bg-amber-950/80 border border-amber-600 p-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-amber-300">
                        <AlertTriangle className="size-3.5 text-amber-400" />
                        <span>EXCEPTION MONITORING</span>
                      </div>
                      <p className="num text-[10px] text-amber-200 mt-1 font-mono">Workspace-derived alerts</p>
                    </div>

                    <div className="rounded bg-slate-900 border border-slate-700 p-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-slate-300">
                        <Boxes className="size-3.5 text-teal-400" />
                        <span>FACTORY</span>
                      </div>
                      <p className="num text-[10px] text-slate-400 mt-1 font-mono">Facility records</p>
                    </div>
                  </div>

                  {/* Node Row 2 */}
                  <div className="relative z-10 flex justify-around items-center my-2">
                    <div className="rounded bg-slate-900 border border-primary/60 p-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-primary">
                        <Boxes className="size-3.5" />
                        <span>INVENTORY POSITIONS</span>
                      </div>
                      <p className="num text-[10px] text-slate-300 mt-1 font-mono">Quantities from uploaded records</p>
                    </div>

                    <div className="rounded bg-slate-900 border border-slate-700 p-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-slate-300">
                        <Truck className="size-3.5 text-teal-400" />
                        <span>SHIPMENTS</span>
                      </div>
                      <p className="num text-[10px] text-slate-400 mt-1 font-mono">Shipment records</p>
                    </div>
                  </div>

                  {/* Node Row 3 */}
                  <div className="relative z-10 flex justify-between items-end">
                    <div className="rounded bg-slate-900 border border-slate-700 p-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-slate-300">
                        <Globe className="size-3.5 text-slate-400" />
                        <span>PURCHASE ORDERS</span>
                      </div>
                      <p className="num text-[10px] text-slate-400 mt-1 font-mono">Workspace order records</p>
                    </div>

                    <div className="rounded bg-slate-900 border border-slate-700 p-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono text-teal-400">
                        <TrendingUp className="size-3.5" />
                        <span>DEMAND FORECAST</span>
                      </div>
                      <p className="num text-[10px] text-slate-400 mt-1 font-mono">Forecasts from workspace records</p>
                    </div>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>FACILITY COVER: FROM YOUR WORKSPACE</span>
                  <span className="text-primary font-bold">EXPOSURE: FROM YOUR WORKSPACE</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 02: GLOBAL SUPPLY NETWORK (SIGNATURE VISUAL)      */}
        {/* ========================================================= */}
        <section id="global-network" className="py-16 border-t border-border/80">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <span className="num text-[10px] font-bold text-primary uppercase tracking-widest font-mono">
              [ GLOBAL NETWORK ARCHITECTURE ]
            </span>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              ONE VIEW OF THE ENTIRE CHAIN
            </h2>
            <p className="text-xs text-muted-foreground max-w-xl mx-auto">
              Connect supplier, facility, inventory, demand, procurement, and shipment records from your workspace.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border border-border bg-card p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="num text-xs font-mono font-bold text-primary">01 // FABRICATION</span>
                <Factory className="size-4 text-primary" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Tier-1 Component Suppliers</h3>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                Track supplier lead times, defect rates (PPM), and delivery compliance across global semiconductor foundries.
              </p>
            </div>

            <div className="rounded border border-border bg-card p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="num text-xs font-mono font-bold text-primary">02 // INVENTORY</span>
                <Boxes className="size-4 text-primary" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Warehouse Stock Cover</h3>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                Monitor safety stock thresholds, inventory cover days, and automated reorder execution per SKU.
              </p>
            </div>

            <div className="rounded border border-border bg-card p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="num text-xs font-mono font-bold text-teal-700">03 // FREIGHT</span>
                <Truck className="size-4 text-teal-700" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">In-Transit Freight Lanes</h3>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                Ocean and air lane OTIF performance, port congestion delays, and freight cost per unit tracking.
              </p>
            </div>

            <div className="rounded border border-border bg-card p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="num text-xs font-mono font-bold text-teal-700">04 // DECISIONS</span>
                <Sparkles className="size-4 text-teal-700" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Prioritized Action Queue</h3>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                AI recommendations ranked by financial value at risk with one-click PO expedite and freight switching.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 03: LIVE COMMAND CENTER SHOWCASE                  */}
        {/* ========================================================= */}
        <section id="command-center" className="py-16 border-t border-border/80">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
            <span className="num text-[10px] font-bold text-teal-700 uppercase tracking-widest font-mono">
              [ REAL-TIME CONTROL CONSOLE ]
            </span>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Industrial Command Center
            </h2>
            <p className="text-xs text-muted-foreground">
              A single operational control tower replacing fragmented spreadsheets with live PostgreSQL telemetry.
            </p>
          </div>

          <div className="mx-auto max-w-2xl text-center">
            <Database className="mx-auto size-8 text-primary" />
            <h3 className="mt-3 font-display text-lg font-bold">Workspace-grounded operations</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to view the inventory, supplier, purchase-order, shipment, demand, and alert records available in your organization workspace.
            </p>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 04: SCENARIO LAB (WHAT-IF SIMULATION)            */}
        {/* ========================================================= */}
        <section id="scenario-lab" className="py-16 border-t border-border/80">
          <div className="mx-auto max-w-3xl text-center space-y-4">
            <span className="num text-[10px] font-bold text-primary uppercase tracking-widest font-mono">
              [ SIMULATION LABORATORY ]
            </span>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              SCENARIO LAB
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Scenario baselines and outputs use the current workspace's PostgreSQL inventory, demand, procurement, and freight records.
            </p>
            <Link to="/auth" className="inline-flex items-center gap-2 rounded bg-primary px-5 py-3 text-xs font-bold text-primary-foreground">
              Sign in to open Scenario Lab <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 05: DATA PIPELINE                                 */}
        {/* ========================================================= */}
        <section id="data-pipeline" className="py-16 border-t border-border/80">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
            <span className="num text-[10px] font-bold text-teal-700 uppercase tracking-widest font-mono">
              [ DATA INGESTION & PIPELINE ]
            </span>
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              OPERATIONS DATA PIPELINE
            </h2>
            <p className="text-xs text-muted-foreground">
              Direct CSV/XLSX file ingestion, automated schema mapping, quality audit checks, and PostgreSQL persistence.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {["● Parsing", "● Validation", "● Persistence", "● Analytics Refresh"].map((b) => (
              <span key={b} className="num rounded border border-border bg-card px-4 py-2 text-xs font-mono font-bold text-foreground shadow-2xs">
                {b}
              </span>
            ))}
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 06: INDUSTRIAL EDITORIAL BREAK                    */}
        {/* ========================================================= */}
        <section className="py-12">
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-xl">
            <img
              src="/industrial_control_tower.png"
              alt="Industrial Manufacturing Control Tower"
              className="w-full h-80 sm:h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent flex items-end p-8 sm:p-12">
              <div className="max-w-2xl space-y-3">
                <span className="num rounded bg-primary/20 border border-primary/40 px-3 py-1 text-[10px] font-mono font-bold text-primary uppercase tracking-wider">
                  GLOBAL MANUFACTURING CONTROL TOWER
                </span>
                <h3 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
                  Enterprise operations intelligence for global manufacturing.
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Integrate supplier scorecards, stock positions, purchase order commit lines, and ocean freight telemetry on one command platform.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 07: FINAL CTA                                     */}
        {/* ========================================================= */}
        <section className="my-16 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-background p-10 lg:p-16 text-center shadow-xl">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              Turn operational complexity into confident decisions.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Connect your operational data, surface what matters, and execute countermeasures before small disruptions become downtime.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded bg-primary px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md transition-all hover:bg-primary/90"
              >
                <span>ENTER COMMAND CENTER</span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded border border-border bg-card px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-foreground shadow-2xs transition-all hover:bg-accent"
              >
                <span>OPEN WORKSPACE</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border/80 py-8 px-6 lg:px-12 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-primary" />
            <span className="font-display font-bold text-foreground">SUPPLYCHAINIQ</span>
            <span>— Industrial Control Tower</span>
          </div>
          <p>© 2026 SUPPLYCHAINIQ Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
