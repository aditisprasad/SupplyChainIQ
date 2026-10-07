import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
    Sparkles,
    Send,
    CheckCircle2,
    Upload,
} from "lucide-react";

import {
    DataTable,
    PageHeader,
    Panel,
    StatusPill,
    num,
    pct,
    usd,
} from "@/components/scm/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { overviewQuery, alertsQuery, aiDecisionQuery } from "@/lib/scm/queries";

export const Route = createFileRoute("/_authenticated/ai-decision")({
    head: () => ({
        meta: [
            { title: "Decision Room — SUPPLYCHAINIQ" },
            {
                name: "description",
                content:
                    "AI decision intelligence grounded in real-time PostgreSQL database records, exception root cause analysis, and countermeasure execution.",
            },
        ],
    }),
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(overviewQuery),
            context.queryClient.ensureQueryData(alertsQuery),
            context.queryClient.ensureQueryData(aiDecisionQuery),
        ]);
    },
    component: AiDecisionPage,
});

const PRESET_PROMPTS = [
    {
        id: "q1",
        title: "What is our primary stockout risk this month?",
        subtitle: "Identify critical inventory exposure and revenue at risk",
    },
    {
        id: "q2",
        title: "Which supplier delay threatens Q4 production revenue?",
        subtitle: "Analyze lead time slips and supplier scorecard breaches",
    },
    {
        id: "q3",
        title: "How can we optimize freight spend across APAC lanes?",
        subtitle: "Mode switch analysis and lane consolidation options",
    },
    {
        id: "q4",
        title: "Generate executive briefing for this organisation",
        subtitle: "Cross-functional summary across demand, stock, and logistics",
    },
];

function AiDecisionPage() {
    const { data: overview } = useSuspenseQuery(overviewQuery);
    const { data: alerts } = useSuspenseQuery(alertsQuery);
    const { data: aiIntel } = useSuspenseQuery(aiDecisionQuery);

    const [activePrompt, setActivePrompt] = useState(PRESET_PROMPTS[0]);
    const [queryInput, setQueryInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);

    const openCriticalAlerts = alerts.filter((a) => a.status === "OPEN" && a.severity === "CRITICAL");

    function handleSelectPrompt(prompt: (typeof PRESET_PROMPTS)[number]) {
        setActivePrompt(prompt);
        setIsThinking(true);
        setTimeout(() => setIsThinking(false), 300);
    }

    function handleCustomSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!queryInput.trim()) return;
        setActivePrompt({
            id: "custom",
            title: queryInput,
            subtitle: "Custom intelligence inquiry",
        });
        setQueryInput("");
        setIsThinking(true);
        setTimeout(() => setIsThinking(false), 400);
    }

    const hasData = aiIntel.hasData ?? (aiIntel.groundedRecords && aiIntel.groundedRecords.length > 0);
    const { topRisk, topDelayedShip, topRiskSup, totalValueAtRisk, groundedRecords, narrative, rootCauseDriver, rootCauseDetail, countermeasures } = aiIntel;

    if (!hasData) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="DECISION ROOM"
                    subtitle="AI root cause synthesis & grounded PostgreSQL exception countermeasure engine"
                    actions={
                        <div className="flex items-center gap-2 rounded border border-border/60 bg-muted px-3 py-1 text-xs font-mono font-bold text-muted-foreground">
                            <Sparkles className="size-3.5" />
                            AI Standby — No Operational Data
                        </div>
                    }
                />
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-24 text-center gap-4">
                    <Sparkles className="size-10 text-muted-foreground/40" />
                    <div>
                        <h3 className="font-semibold text-foreground text-base">Decision AI requires operational data</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">Import suppliers, inventory positions, and shipments to activate AI root cause synthesis and countermeasure recommendations.</p>
                    </div>
                    <Link to="/data">
                        <Button className="gap-2 font-bold text-xs">
                            <Upload className="size-3.5" />
                            Import Operational Data
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="DECISION ROOM"
                subtitle="AI root cause synthesis & grounded PostgreSQL exception countermeasure engine"
                actions={
                    <div className="flex items-center gap-2 rounded border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-mono font-bold text-primary">
                        <Sparkles className="size-3.5" />
                        AI Decision Model: Active
                    </div>
                }
            />

            {/* 1. TOP METRICS STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded border border-amber-300 bg-amber-50/70 p-4 shadow-2xs">
                    <span className="num text-[10px] font-bold text-amber-900 uppercase font-mono block">VALUE AT RISK</span>
                    <span className="num text-xl font-bold text-amber-950 mt-1 block">{usd(totalValueAtRisk, { compact: true })}</span>
                    <span className="text-[11px] text-amber-800 mt-1 block font-mono font-bold">Open network exceptions</span>
                </div>

                <div className="rounded border border-border bg-card p-4 shadow-2xs">
                    <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">CRITICAL EXCEPTIONS</span>
                    <span className="num text-xl font-bold text-foreground mt-1 block">{num(openCriticalAlerts.length)} Alerts</span>
                    <span className="text-[11px] text-muted-foreground mt-1 block font-mono">Immediate mitigation needed</span>
                </div>

                <div className="rounded border border-border bg-card p-4 shadow-2xs">
                    <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">GROUNDED DB ENTITIES</span>
                    <span className="num text-xl font-bold text-foreground mt-1 block">
                        {num(overview.kpis.skusAtRisk + overview.kpis.suppliersAtRisk + overview.kpis.delayedShipments)}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-1 block font-mono">PostgreSQL relational records</span>
                </div>

                <div className="rounded border border-primary/40 bg-primary/5 p-4 shadow-2xs">
                    <span className="num text-[10px] font-bold text-primary uppercase font-mono block">CONFIDENCE RATING</span>
                    <span className="num text-xl font-bold text-primary mt-1 block">{pct(overview.kpis.forecastAccuracyPct)}</span>
                    <span className="text-[11px] text-muted-foreground mt-1 block font-mono">Forecast accuracy from demand actuals</span>
                </div>
            </div>

            {/* 2. MAIN DECISION ROOM CONSOLE */}
            <div className="grid gap-6 lg:grid-cols-12">
                {/* LEFT PROMPTS INQUIRY SIDEBAR */}
                <Panel title="DECISION INQUIRIES" description="Select executive query" className="lg:col-span-4">
                    <div className="space-y-2.5 font-mono text-xs">
                        {PRESET_PROMPTS.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => handleSelectPrompt(p)}
                                className={`cursor-pointer rounded border p-3 transition-all ${activePrompt?.id === p.id
                                    ? "border-primary bg-primary/10 text-foreground font-bold shadow-2xs"
                                    : "border-border/80 hover:border-primary/40 bg-card text-muted-foreground"
                                    }`}
                            >
                                <div className="flex items-center gap-1.5 text-foreground font-bold">
                                    <Sparkles className="size-3.5 text-primary shrink-0" />
                                    <span>{p.title}</span>
                                </div>
                                <p className="mt-1 text-[11px] text-muted-foreground font-normal">{p.subtitle}</p>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleCustomSubmit} className="mt-4 flex items-center gap-2">
                        <Input
                            value={queryInput}
                            onChange={(e) => setQueryInput(e.target.value)}
                            placeholder="Ask Decision AI..."
                            className="text-xs font-mono border-border"
                        />
                        <Button type="submit" size="sm" className="bg-primary text-primary-foreground shrink-0 font-mono font-bold">
                            <Send className="size-3.5" />
                        </Button>
                    </form>
                </Panel>

                {/* RIGHT AI DECISION SYNTHESIS & COUNTERMEASURE PANEL */}
                <Panel
                    title={activePrompt?.title ?? "AI Decision Intelligence"}
                    description="Synthesized from PostgreSQL tables (inventory_positions, suppliers, demand_forecasts, shipments)"
                    className="lg:col-span-8"
                >
                    {isThinking ? (
                        <div className="flex flex-col items-center justify-center py-16 font-mono text-xs">
                            <Sparkles className="size-8 text-primary animate-pulse mb-3" />
                            <p className="font-bold text-foreground">Evaluating PostgreSQL relational tables & calculating exposure...</p>
                        </div>
                    ) : (
                        <div className="space-y-5 font-mono">
                            {/* Executive Summary */}
                            <div className="rounded border border-primary/40 bg-primary/5 p-4 space-y-2">
                                <span className="text-[10px] font-bold uppercase text-primary flex items-center gap-1.5">
                                    <Sparkles className="size-3.5" />
                                    AI DECISION RECOMMENDATION
                                </span>
                                <p className="text-xs text-foreground leading-relaxed">{narrative}</p>
                            </div>

                            {/* Financial Impact & Root Cause */}
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                                <div className="rounded border border-amber-300 bg-amber-50/70 p-3.5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-amber-900 block">FINANCIAL IMPACT</span>
                                    <span className="num text-xl font-bold text-amber-950 block">{usd(topRisk?.impactUsd ?? totalValueAtRisk)}</span>
                                    <span className="text-[11px] text-amber-800 block">Calculated revenue shortfall exposure for {topRisk?.sku ?? "impacted SKUs"}.</span>
                                </div>
                                <div className="rounded border border-amber-300 bg-amber-50/70 p-3.5 space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-amber-900 block">ROOT CAUSE DRIVER</span>
                                    <span className="text-sm font-bold text-amber-950 block">{rootCauseDriver}</span>
                                    <span className="text-[11px] text-amber-800 block">{rootCauseDetail}</span>
                                </div>
                            </div>

                            {/* Countermeasures */}
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground block">RECOMMENDED COUNTERMEASURES</span>
                                <div className="space-y-2 text-xs">
                                    {countermeasures.length === 0 ? (
                                        <div className="p-3 rounded bg-card border border-border text-muted-foreground">
                                            No countermeasures generated from current exception records.
                                        </div>
                                    ) : (
                                        countermeasures.map((item) => (
                                            <div key={item} className="flex items-start gap-2.5 p-3 rounded bg-card border border-border">
                                                <CheckCircle2 className="size-4 text-teal-700 shrink-0 mt-0.5" />
                                                <div>{item}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Grounded Source Records Table */}
                            <div className="border-t border-border pt-4 space-y-2">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground block">GROUNDED SOURCE RECORDS FROM DATABASE</span>
                                <DataTable headers={["ENTITY TYPE", "IDENTIFIER", "STATUS", "DATABASE TABLE", "IMPACT"]}>
                                    {groundedRecords.map((r, i) => (
                                        <tr key={i} className="border-t border-border/60 hover:bg-muted/40 text-xs">
                                            <td className="px-3.5 py-2.5 font-bold text-foreground">{r.entityType}</td>
                                            <td className="num px-3.5 py-2.5 font-bold">{r.identifier}</td>
                                            <td className="px-3.5 py-2.5"><StatusPill value={r.status} /></td>
                                            <td className="px-3.5 py-2.5 text-muted-foreground"><code>{r.table}</code></td>
                                            <td className="num px-3.5 py-2.5 font-bold text-amber-800">{r.impact}</td>
                                        </tr>
                                    ))}
                                </DataTable>
                            </div>
                        </div>
                    )}
                </Panel>
            </div>
        </div>
    );
}
