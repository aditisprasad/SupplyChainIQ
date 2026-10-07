import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DollarSign, TrendingDown, ShoppingBag, ShieldAlert, ArrowRight, Layers } from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import {
    DataTable,
    EmptyState,
    PageHeader,
    Panel,
    StatusPill,
    num,
    usd,
} from "@/components/scm/primitives";
import { Button } from "@/components/ui/button";
import { procurementIntelligenceQuery, purchaseOrdersQuery, suppliersQuery } from "@/lib/scm/queries";

export const Route = createFileRoute("/_authenticated/procurement")({
    head: () => ({
        meta: [
            { title: "Procurement Control — SUPPLYCHAINIQ" },
            {
                name: "description",
                content:
                    "Procurement money flow, supplier spend concentration, purchase order commitment lines, and savings inbox.",
            },
        ],
    }),
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(purchaseOrdersQuery),
            context.queryClient.ensureQueryData(suppliersQuery),
            context.queryClient.ensureQueryData(procurementIntelligenceQuery),
        ]);
    },
    component: ProcurementPage,
});

function ProcurementPage() {
    const { data: pos } = useSuspenseQuery(purchaseOrdersQuery);
    const { data: suppliers } = useSuspenseQuery(suppliersQuery);
    const { data: procIntel } = useSuspenseQuery(procurementIntelligenceQuery);

    const totalCommitted = pos.filter((p) => p.status !== "RECEIVED").reduce((a, b) => a + b.totalValueUsd, 0);
    const totalReceived = pos.filter((p) => p.status === "RECEIVED").reduce((a, b) => a + b.totalValueUsd, 0);
    const totalAnnualSpend = suppliers.rows.reduce((a, b) => a + b.annualSpendUsd, 0);

    const categoryMap = new Map<string, number>();
    suppliers.rows.forEach((s) => {
        const prev = categoryMap.get(s.category) ?? 0;
        categoryMap.set(s.category, prev + s.annualSpendUsd);
    });
    const spendByCategory = [...categoryMap.entries()].map(([name, value]) => ({ name, value }));

    const topSpendSuppliers = [...suppliers.rows]
        .sort((a, b) => b.annualSpendUsd - a.annualSpendUsd)
        .slice(0, 6)
        .map((s) => ({ name: s.name, spend: s.annualSpendUsd, risk: s.riskScore }));

    if (pos.length === 0 && suppliers.rows.length === 0) {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="PROCUREMENT CONTROL"
                    subtitle="Procurement money flow, supplier spend concentration, and purchase order commitments"
                    actions={
                        <Button asChild size="sm" className="gap-2 font-bold text-xs">
                            <Link to="/data">
                                <ShoppingBag className="size-3.5" />
                                Import POs & Suppliers
                            </Link>
                        </Button>
                    }
                />
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center gap-4">
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <ShoppingBag className="size-6" />
                    </div>
                    <div className="max-w-md space-y-1">
                        <h3 className="font-semibold text-foreground text-base">No Procurement Data Found</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Import purchase orders and supplier scorecards to view spend concentration, PO commitment tracking, and savings opportunities.
                        </p>
                    </div>
                    <Button asChild className="gap-2 font-bold text-xs mt-2">
                        <Link to="/data">Import PO & Supplier Data</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="PROCUREMENT CONTROL"
                subtitle="Commercial capital allocation & purchase order committed spend"
            />

            {/* 1. TOP METRICS STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded border border-primary/40 bg-primary/5 p-4 shadow-2xs">
                    <span className="num text-[10px] font-bold text-primary uppercase font-mono block">ANNUAL PROCUREMENT SPEND</span>
                    <span className="num text-xl font-bold text-primary mt-1 block">{usd(totalAnnualSpend, { compact: true })}</span>
                    <span className="text-[11px] text-muted-foreground mt-1 block font-mono">{num(suppliers.rows.length)} active vendors</span>
                </div>

                <div className="rounded border border-amber-300 bg-amber-50/70 p-4 shadow-2xs">
                    <span className="num text-[10px] font-bold text-amber-900 uppercase font-mono block">OPEN PO EXPOSURE</span>
                    <span className="num text-xl font-bold text-amber-950 mt-1 block">{usd(totalCommitted, { compact: true })}</span>
                    <span className="text-[11px] text-amber-800 mt-1 block font-bold font-mono">Unfulfilled committed lines</span>
                </div>

                <div className="rounded border border-border bg-card p-4 shadow-2xs">
                    <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">FULFILLED PO VALUE</span>
                    <span className="num text-xl font-bold text-foreground mt-1 block">{usd(totalReceived, { compact: true })}</span>
                    <span className="text-[11px] text-teal-700 mt-1 block font-bold font-mono">Received into warehouse</span>
                </div>

                <div className="rounded border border-border bg-card p-4 shadow-2xs">
                    <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">IDENTIFIED SAVINGS</span>
                    <span className="num text-xl font-bold text-teal-700 mt-1 block">{usd(procIntel.totalIdentifiedSavings, { compact: true })}</span>
                    <span className="text-[11px] text-muted-foreground mt-1 block font-mono">{num(procIntel.opportunities.length)} commercial actions</span>
                </div>
            </div>

            {/* 2. MONEY FLOW VISUALIZATION */}
            <Panel title="PROCUREMENT MONEY FLOW PIPELINE" description="Commercial capital flow: Commodity Category → Supplier → Active POs">
                <div className="rounded bg-slate-950 p-5 border border-slate-800 text-slate-100 font-mono space-y-4">
                    <div className="grid grid-cols-4 gap-3 text-center">
                        <div className="rounded bg-slate-900 p-3 border border-slate-700">
                            <span className="text-[10px] text-slate-400 block font-bold">COMMODITY CATEGORIES</span>
                            <span className="text-xs font-bold text-white mt-1 block">{spendByCategory.length} Categories</span>
                        </div>
                        <div className="rounded bg-slate-900 p-3 border border-primary/50">
                            <span className="text-[10px] text-primary block font-bold">SUPPLIER BASE</span>
                            <span className="text-xs font-bold text-primary mt-1 block">{num(suppliers.rows.length)} Scored Vendors</span>
                        </div>
                        <div className="rounded bg-slate-900 p-3 border border-amber-600">
                            <span className="text-[10px] text-amber-400 block font-bold">COMMITTED PO LINES</span>
                            <span className="text-xs font-bold text-amber-300 mt-1 block">{usd(totalCommitted, { compact: true })}</span>
                        </div>
                        <div className="rounded bg-slate-900 p-3 border border-slate-700">
                            <span className="text-[10px] text-slate-400 block font-bold">NET ANNUAL SPEND</span>
                            <span className="text-xs font-bold text-teal-400 mt-1 block">{usd(totalAnnualSpend, { compact: true })}</span>
                        </div>
                    </div>
                </div>
            </Panel>

            {/* 3. SPEND CONCENTRATION & SAVINGS */}
            <div className="grid gap-6 xl:grid-cols-12">
                <Panel title="Top Supplier Spend Concentration" description="Annual spend ranked by vendor value" className="xl:col-span-8">
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topSpendSuppliers} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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

                <Panel title="Category Concentration" description="Distribution by commodity group" className="xl:col-span-4">
                    <div className="space-y-3 font-mono text-xs">
                        {spendByCategory.map((c) => (
                            <div key={c.name} className="flex justify-between items-center p-2 rounded bg-muted/40 border border-border">
                                <span className="font-bold text-foreground">{c.name}</span>
                                <span className="text-muted-foreground">{usd(c.value, { compact: true })}</span>
                            </div>
                        ))}
                    </div>
                </Panel>
            </div>

            {/* 4. SAVINGS OPPORTUNITIES TABLE */}
            <Panel title="SAVINGS OPPORTUNITIES INBOX" description="High-leverage commercial actions to reduce COGS">
                {procIntel.opportunities.length === 0 ? (
                    <EmptyState title="No savings opportunities identified from the current dataset." description="All vendor pricing tiers and contract terms are currently optimized." />
                ) : (
                    <DataTable headers={["CATEGORY", "SUPPLIER", "SKU", "POTENTIAL SAVINGS", "IMPACT", "ACTION"]}>
                        {procIntel.opportunities.map((s) => (
                            <tr key={s.id} className="border-t border-border/60 hover:bg-muted/40 transition-colors">
                                <td className="px-3.5 py-2.5 font-mono text-xs font-bold text-foreground">{s.category}</td>
                                <td className="px-3.5 py-2.5 font-mono text-xs text-muted-foreground">{s.supplier}</td>
                                <td className="num px-3.5 py-2.5 font-mono text-xs text-muted-foreground">{s.sku}</td>
                                <td className="num px-3.5 py-2.5 font-mono text-xs font-bold text-teal-700">{usd(s.potentialSavings)}</td>
                                <td className="px-3.5 py-2.5">
                                    <StatusPill value={s.impact} />
                                </td>
                                <td className="px-3.5 py-2.5 text-xs text-muted-foreground max-w-md">{s.action}</td>
                            </tr>
                        ))}
                    </DataTable>
                )}
            </Panel>
        </div>
    );
}

