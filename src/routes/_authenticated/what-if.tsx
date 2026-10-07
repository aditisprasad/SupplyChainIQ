import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
    SlidersHorizontal,
    TrendingUp,
    AlertTriangle,
    RefreshCcw,
    BarChart3,
    DollarSign,
    Layers,
    Sparkles,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Legend,
} from "recharts";

import {
    DataTable,
    PageHeader,
    Panel,
    num,
    usd,
} from "@/components/scm/primitives";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { inventoryQuery, overviewQuery } from "@/lib/scm/queries";

export const Route = createFileRoute("/_authenticated/what-if")({
    head: () => ({
        meta: [
            { title: "Scenario Lab — SUPPLYCHAINIQ" },
            {
                name: "description",
                content:
                    "Supply chain stress-testing workstation: simulate demand shocks, lead time delays, freight rate spikes, and tariff policy changes.",
            },
        ],
    }),
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(overviewQuery),
            context.queryClient.ensureQueryData(inventoryQuery),
        ]);
    },
    component: WhatIfPage,
});

function WhatIfPage() {
    const { data: overview } = useSuspenseQuery(overviewQuery);
    const { data: inventory } = useSuspenseQuery(inventoryQuery);

    const [demandSurge, setDemandSurge] = useState(0);
    const [leadTimeShift, setLeadTimeShift] = useState(0);
    const [freightInflation, setFreightInflation] = useState(0);
    const [tariffRate, setTariffRate] = useState(0);

    // Baseline derived entirely from live PostgreSQL overview data
    const baselineRevenue = overview.kpis.annualRevenueUsd;
    const baselineCost = overview.kpis.openPoValueUsd + overview.kpis.freightSpendUsd;
    const baselineMargin = Math.max(0, baselineRevenue - baselineCost);
    const baselineCapital = overview.kpis.inventoryValueUsd;
    const totalOnHand = inventory.rows.reduce((sum, row) => sum + row.onHand, 0);
    const totalDailyDemand = inventory.rows.reduce((sum, row) => sum + row.avgDailyDemand, 0);
    const baselineCoverDays = totalDailyDemand > 0 ? totalOnHand / totalDailyDemand : null;

    const simRevenue = baselineRevenue * (1 + demandSurge / 100);
    const simFreightExtra = overview.kpis.freightSpendUsd * (freightInflation / 100);
    const simTariffExtra = overview.kpis.openPoValueUsd * (tariffRate / 100);
    const simCost = baselineCost + simFreightExtra + simTariffExtra;
    const simMargin = simRevenue - simCost;
    const marginDelta = simMargin - baselineMargin;
    const simulatedCoverDays = baselineCoverDays === null
        ? null
        : Math.max(0, baselineCoverDays / (1 + demandSurge / 100) - leadTimeShift);

    const chartData = [
        { metric: "Gross Margin", Baseline: Math.round(baselineMargin / 1000), Simulated: Math.round(simMargin / 1000) },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="SCENARIO LAB"
                subtitle="Supply chain shock simulation & financial resilience stress tester"
                actions={
                    <Button
                        onClick={() => {
                            setDemandSurge(0);
                            setLeadTimeShift(0);
                            setFreightInflation(0);
                            setTariffRate(0);
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs font-mono font-bold"
                    >
                        <RefreshCcw className="size-3.5" />
                        Reset Baseline
                    </Button>
                }
            />

            {/* 1. TOP METRICS STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`rounded border p-4 shadow-2xs ${marginDelta >= 0 ? "border-teal-300 bg-teal-50/70" : "border-amber-300 bg-amber-50/70"}`}>
                    <span className="num text-[10px] font-bold uppercase font-mono block">SIMULATED MARGIN DELTA</span>
                    <span className={`num text-xl font-bold mt-1 block ${marginDelta >= 0 ? "text-teal-950" : "text-amber-950"}`}>
                        {usd(marginDelta)}
                    </span>
                    <span className="text-[11px] font-mono font-bold mt-1 block">
                        {marginDelta >= 0 ? "Favorable scenario gain" : "Unfavorable margin drag"}
                    </span>
                </div>

                <div className="rounded border border-border bg-card p-4 shadow-2xs">
                    <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">SIMULATED NET MARGIN</span>
                    <span className="num text-xl font-bold text-foreground mt-1 block">{usd(simMargin, { compact: true })}</span>
                    <span className="text-[11px] text-muted-foreground mt-1 block font-mono">Baseline: {usd(baselineMargin, { compact: true })}</span>
                </div>

                <div className="rounded border border-border bg-card p-4 shadow-2xs">
                    <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">PROJECTED STOCKOUT UNITS</span>
                    <span className="num text-xl font-bold text-amber-800 mt-1 block">{simulatedCoverDays === null ? "—" : `${num(simulatedCoverDays, 1)} days`}</span>
                    <span className="text-[11px] text-amber-800 mt-1 block font-mono font-bold">Derived from workspace stock and demand</span>
                </div>

                <div className="rounded border border-border bg-card p-4 shadow-2xs">
                    <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">CAPITAL REQUIRED</span>
                    <span className="num text-xl font-bold text-foreground mt-1 block">{usd(baselineCapital, { compact: true })}</span>
                    <span className="text-[11px] text-muted-foreground mt-1 block font-mono">Current inventory value from PostgreSQL</span>
                </div>
            </div>

            {/* 2. SPLIT SCREEN: LEFT CONTROLS, RIGHT IMPACT MATRIX */}
            <div className="grid gap-6 lg:grid-cols-12">
                {/* LEFT: SCENARIO CONTROLS (COL SPAN 5) */}
                <Panel title="SCENARIO CONTROLS" description="Adjust market disruption variables" className="lg:col-span-5">
                    <div className="space-y-6 font-mono text-xs">
                        <div>
                            <div className="flex justify-between items-center mb-1.5 font-bold">
                                <span>Demand Surge Factor</span>
                                <span className="text-primary">{demandSurge > 0 ? `+${demandSurge}%` : `${demandSurge}%`}</span>
                            </div>
                            <input
                                type="range"
                                min="-30"
                                max="100"
                                step="5"
                                value={demandSurge}
                                onChange={(e) => setDemandSurge(Number(e.target.value))}
                                className="w-full accent-primary"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5 font-bold">
                                <span>Lead Time Delay (Days)</span>
                                <span className="text-amber-800">+{leadTimeShift} Days</span>
                            </div>
                            <input
                                type="range"
                                min="-10"
                                max="45"
                                step="1"
                                value={leadTimeShift}
                                onChange={(e) => setLeadTimeShift(Number(e.target.value))}
                                className="w-full accent-amber-600"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5 font-bold">
                                <span>Freight Rate Spike %</span>
                                <span className="text-teal-700">+{freightInflation}%</span>
                            </div>
                            <input
                                type="range"
                                min="-20"
                                max="100"
                                step="5"
                                value={freightInflation}
                                onChange={(e) => setFreightInflation(Number(e.target.value))}
                                className="w-full accent-teal-700"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5 font-bold">
                                <span>Import Duty / Tariff %</span>
                                <span className="text-primary">+{tariffRate}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="30"
                                step="2"
                                value={tariffRate}
                                onChange={(e) => setTariffRate(Number(e.target.value))}
                                className="w-full accent-primary"
                            />
                        </div>
                    </div>
                </Panel>

                {/* RIGHT: SIMULATION IMPACT MATRIX (COL SPAN 7) */}
                <div className="lg:col-span-7 space-y-6">
                    <Panel title="SIMULATION RESULT MATRIX" description="Baseline vs. Scenario financial comparison (₹'000)">
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 15, right: 15, left: 15, bottom: 5 }}>
                                    <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                                    <XAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}k`} />
                                    <Tooltip
                                        contentStyle={{
                                            background: "#171A1D",
                                            border: "1px solid #252A2E",
                                            color: "#F8F7F5",
                                            fontSize: 11,
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                                    <Bar dataKey="Baseline" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Simulated" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Panel>

                    <Panel title="SCENARIO ASSUMPTIONS" description="Adjust the controls to calculate changes against current workspace records">
                        <p className="text-sm text-muted-foreground">No preset operational scenarios are loaded. Baselines are read from PostgreSQL.</p>
                    </Panel>
                </div>
            </div>
        </div>
    );
}
