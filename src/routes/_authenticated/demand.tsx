import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, BarChart3, Sliders, Layers, LoaderCircle, Sparkles } from "lucide-react";

import {
  DataTable,
  PageHeader,
  Panel,
  num,
  pct,
  usd,
} from "@/components/scm/primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { demandQuery } from "@/lib/scm/queries";
import { runDemandForecast } from "@/lib/scm/scm.functions";

export const Route = createFileRoute("/_authenticated/demand")({
  head: () => ({
    meta: [
      { title: "Demand Planning — SUPPLYCHAINIQ" },
      {
        name: "description",
        content:
          "Statistical demand forecasting workstation, actual vs forecast timeline, MAPE, MAE, forecast bias, and confidence bands.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(demandQuery()),
  component: DemandPage,
});

function DemandPage() {
  const [productId, setProductId] = useState<string>("all");
  const queryClient = useQueryClient();
  const generateForecast = useServerFn(runDemandForecast);
  const { data } = useSuspenseQuery(demandQuery(productId === "all" ? undefined : productId));
  const s = data.summary;
  const forecastMutation = useMutation({
    mutationFn: () =>
      generateForecast({
        data: productId === "all" ? {} : { productId },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["scm", "demand"] });
    },
  });

  const runForecast = () => forecastMutation.mutate();

  if (data.series.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="DEMAND PLANNING"
          subtitle="Statistical forecasting workstation & rolling demand confidence bands"
          actions={
            <Button asChild size="sm" className="gap-2 font-bold text-xs">
              <Link to="/data">
                <TrendingUp className="size-3.5" />
                Import Demand History
              </Link>
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-20 text-center gap-4">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <TrendingUp className="size-6" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="font-semibold text-foreground text-base">No Demand History Found</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Import demand history records (SKU, site, period_month, units) to enable statistical forecasting, MAPE analysis, and confidence bands.
            </p>
          </div>
          <Button asChild className="gap-2 font-bold text-xs mt-2">
            <Link to="/data">Import Demand History</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="DEMAND PLANNING"
        subtitle="Statistical forecasting workstation & rolling demand confidence bands"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="w-[260px] h-8 text-xs font-mono font-bold border-border">
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Network SKUs</SelectItem>
                {data.products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.sku} · {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="h-8 gap-2 text-xs font-bold"
              onClick={runForecast}
              disabled={forecastMutation.isPending}
            >
              {forecastMutation.isPending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {forecastMutation.isPending ? "Generating..." : "Generate Forecast"}
            </Button>
          </div>
        }
      />

      {forecastMutation.isSuccess ? (
        <div role="status" className="rounded border border-teal-300 bg-teal-50/70 px-4 py-3 text-xs text-teal-900">
          {forecastMutation.data.eligibleSeries === 0 ? (
            <>
              No forecasts were generated. At least {forecastMutation.data.minimumHistoryMonths} monthly actual demand observations
              per SKU/site are required; no forecast rows were saved.
            </>
          ) : (
            <>
              Saved {num(forecastMutation.data.futureForecasts)} future monthly forecasts across{" "}
              {num(forecastMutation.data.eligibleSeries)} SKU/site series.
              {forecastMutation.data.historicalBacktests > 0
                ? ` Generated ${num(forecastMutation.data.historicalBacktests)} walk-forward historical evaluations.`
                : ""}
              {forecastMutation.data.insufficientSeries > 0
                ? ` ${num(forecastMutation.data.insufficientSeries)} series skipped for insufficient history.`
                : ""}
            </>
          )}
        </div>
      ) : null}
      {forecastMutation.isError ? (
        <div role="alert" className="rounded border border-destructive/40 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          Forecast generation failed: {forecastMutation.error.message}
        </div>
      ) : null}

      {/* 1. TOP METRICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded border border-primary/40 bg-primary/5 p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-primary uppercase font-mono block">FORECAST ACCURACY</span>
          <span className="num text-xl font-bold text-primary mt-1 block">{pct(s.accuracyPct)}</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">Statistical baseline</span>
        </div>

        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">MAPE ERROR</span>
          <span className="num text-xl font-bold text-foreground mt-1 block">{pct(s.mapePct)}</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">Mean abs % error</span>
        </div>

        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">FORECAST BIAS</span>
          <span className="num text-xl font-bold text-foreground mt-1 block">{pct(s.biasPct)}</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">
            {s.biasPct > 0 ? "Over-forecasting" : "Under-forecasting"}
          </span>
        </div>

        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">NEXT 6M FORECAST</span>
          <span className="num text-xl font-bold text-teal-700 mt-1 block">{num(s.next6mUnits)}</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">Projected units</span>
        </div>

        <div className="rounded border border-border bg-card p-4 shadow-2xs">
          <span className="num text-[10px] font-bold text-muted-foreground uppercase font-mono block">TRAILING 12M ACTUALS</span>
          <span className="num text-xl font-bold text-foreground mt-1 block">{num(s.trailing12mUnits)}</span>
          <span className="text-[11px] text-muted-foreground mt-1 block font-mono">Shipped units</span>
        </div>
      </div>

      {/* 2. DEMAND TIMELINE CHART */}
      <Panel title="ACTUAL DEMAND → FORECAST CONFIDENCE BANDS" description="Rolling actuals with 80% statistical confidence interval">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.series}>
              <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} width={48} />
              <Tooltip
                contentStyle={{
                  background: "#171A1D",
                  border: "1px solid #252A2E",
                  color: "#F8F7F5",
                  fontSize: 11,
                }}
              />
              <Area
                type="monotone"
                dataKey="high"
                name="Upper Bound"
                stroke="none"
                fill="hsl(var(--primary))"
                fillOpacity={0.15}
              />
              <Area
                type="monotone"
                dataKey="low"
                name="Lower Bound"
                stroke="none"
                fill="hsl(var(--background))"
                fillOpacity={0.9}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Demand"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke="#0F766E"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* 3. SKU SCORECARD TABLE */}
      <div className="grid gap-6 xl:grid-cols-12">
        <Panel title="FORECAST SCORECARD BY SKU" description="Ranked by projected six-month revenue volume" className="xl:col-span-8">
          <DataTable headers={["SKU", "CLASS", "ACCURACY", "MAPE", "BIAS", "NEXT 6M REVENUE"]}>
            {data.accuracyByProduct.map((p) => (
              <tr key={p.productId} className="border-t border-border/60 hover:bg-muted/40 transition-colors">
                <td className="px-3.5 py-2.5">
                  <span className="num font-bold text-foreground text-xs font-mono">{p.sku}</span>
                  <span className="ml-2 text-xs text-muted-foreground font-mono">{p.name}</span>
                </td>
                <td className="px-3.5 py-2.5 font-mono text-xs text-muted-foreground">{p.abcClass}</td>
                <td className="num px-3.5 py-2.5 text-xs font-bold font-mono text-teal-700">{pct(p.accuracyPct)}</td>
                <td className="num px-3.5 py-2.5 text-xs font-mono text-muted-foreground">{pct(p.mapePct)}</td>
                <td className="num px-3.5 py-2.5 text-xs font-mono text-muted-foreground">{pct(p.biasPct)}</td>
                <td className="num px-3.5 py-2.5 text-xs font-bold font-mono text-foreground">{usd(p.next6mRevenueUsd, { compact: true })}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>

        <Panel title="FORWARD DEMAND BY DC" description="Next 6 months projected allocation" className="xl:col-span-4">
          <DataTable headers={["SITE", "REGION", "UNITS"]}>
            {data.regionMix.map((r) => (
              <tr key={r.site} className="border-t border-border/60 hover:bg-muted/40 transition-colors">
                <td className="num px-3.5 py-2.5 text-xs font-bold text-foreground font-mono">{r.site}</td>
                <td className="px-3.5 py-2.5 text-xs text-muted-foreground font-mono">{r.region}</td>
                <td className="num px-3.5 py-2.5 text-xs font-bold font-mono text-primary">{num(r.next6mUnits)}</td>
              </tr>
            ))}
          </DataTable>
        </Panel>
      </div>
    </div>
  );
}
