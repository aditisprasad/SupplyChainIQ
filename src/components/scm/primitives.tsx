import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Upload, Database, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function formatCurrency(
  value: number,
  opts: { compact?: boolean; currency?: string } = {}
) {
  const currency = opts.currency ?? "INR";
  const numVal = value || 0;

  if (currency === "INR") {
    if (opts.compact) {
      const abs = Math.abs(numVal);
      const sign = numVal < 0 ? "-" : "";
      if (abs >= 10_00_00_000) {
        return `${sign}₹${(abs / 1_00_00_000).toFixed(1)} Cr`;
      }
      if (abs >= 1_00_00_000) {
        return `${sign}₹${(abs / 1_00_00_000).toFixed(2)} Cr`;
      }
      if (abs >= 1_00_000) {
        return `${sign}₹${(abs / 1_00_000).toFixed(1)} L`;
      }
      if (abs >= 1_000) {
        return `${sign}₹${(abs / 1_000).toFixed(1)} K`;
      }
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(numVal);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? 1 : 0,
  }).format(numVal);
}

export function inr(value: number, opts: { compact?: boolean } = {}) {
  return formatCurrency(value, { ...opts, currency: "INR" });
}

export function usd(value: number, opts: { compact?: boolean } = {}) {
  return inr(value, opts);
}

export function num(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value || 0);
}

export function pct(value: number | null | undefined, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  tone?: "default" | "primary" | "warning" | "danger" | "success" | undefined;
  icon?: React.ElementType | undefined;
}) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary font-semibold",
    warning: "text-amber-700 font-semibold dark:text-amber-600",
    danger: "text-rose-700 font-semibold dark:text-rose-600",
    success: "text-emerald-700 font-semibold dark:text-emerald-600",
  }[tone];

  const borderClass = {
    default: "border-border",
    primary: "border-primary/30 bg-primary/[0.02]",
    warning: "border-amber-200 bg-amber-50/40 dark:border-amber-900/30",
    danger: "border-rose-200 bg-rose-50/40 dark:border-rose-900/30",
    success: "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/30",
  }[tone];

  return (
    <div className={cn("panel relative overflow-hidden p-4.5 transition-all hover:shadow-sm", borderClass)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon ? <Icon className="size-4 text-muted-foreground/70" /> : null}
      </div>
      <p className={cn("num mt-2 text-2xl font-bold tracking-tight", toneClass)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={cn("panel flex flex-col p-5", className)}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

const TONES: Record<string, string> = {
  PENDING: "bg-amber-100/80 text-amber-800 border-amber-300/80",
  PUBLISHED: "bg-sky-100/80 text-sky-800 border-sky-300/80",
  PROCESSED: "bg-emerald-100/70 text-emerald-800 border-emerald-300/80",
  FAILED: "bg-rose-100/80 text-rose-800 border-rose-300/80",
  HEALTHY: "bg-emerald-100/70 text-emerald-800 border-emerald-300/80",
  DELIVERED: "bg-emerald-100/70 text-emerald-800 border-emerald-300/80",
  ACTIVE: "bg-emerald-100/70 text-emerald-800 border-emerald-300/80",
  LOW: "bg-emerald-100/70 text-emerald-800 border-emerald-300/80",
  RESOLVED: "bg-emerald-100/70 text-emerald-800 border-emerald-300/80",
  EXCESS: "bg-emerald-50 text-emerald-900 border-emerald-200",
  IN_TRANSIT: "bg-sky-100/80 text-sky-800 border-sky-300/80",
  OPEN: "bg-sky-100/80 text-sky-800 border-sky-300/80",
  MODERATE: "bg-amber-100/80 text-amber-800 border-amber-300/80",
  BELOW_REORDER: "bg-amber-100/80 text-amber-800 border-amber-300/80",
  DELAYED: "bg-amber-100/80 text-amber-800 border-amber-300/80",
  AT_RISK: "bg-amber-100/80 text-amber-800 border-amber-300/80",
  CRITICAL_RISK: "bg-rose-100/80 text-rose-800 border-rose-300/80",
  HIGH: "bg-amber-100/80 text-amber-800 border-amber-300/80",
  MEDIUM: "bg-amber-100/80 text-amber-800 border-amber-300/80",
  ACKNOWLEDGED: "bg-amber-100/80 text-amber-800 border-amber-300/80",
  STOCKOUT_RISK: "bg-rose-100/80 text-rose-800 border-rose-300/80",
  SEVERE: "bg-rose-100/80 text-rose-800 border-rose-300/80",
  CRITICAL: "bg-rose-100/80 text-rose-800 border-rose-300/80",
  SUSPENDED: "bg-rose-100/80 text-rose-800 border-rose-300/80",
};

export function StatusPill({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide shadow-2xs",
        TONES[value] ?? "bg-slate-100 text-slate-700 border-slate-200",
        className,
      )}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function DataTable({
  headers,
  children,
  className,
}: {
  headers: string[];
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-md border border-border/80 bg-card", className)}>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            {headers.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Database className="size-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="mt-1 max-w-md text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {action ? (
        <div className="mt-1">{action}</div>
      ) : (
        <Button asChild size="sm" className="mt-1 gap-1.5 bg-primary font-medium text-primary-foreground">
          <Link to="/data">
            <Upload className="size-3.5" />
            Import Dataset
          </Link>
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="panel flex flex-col items-center gap-3 p-8 text-center"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <AlertCircle className="size-5" />
      </div>
      <p className="text-sm font-semibold text-foreground">This view couldn't load</p>
      <p className="max-w-md text-xs text-muted-foreground">
        {error.message || "The request failed. Check your connection and try again."}
      </p>
      <Button
        onClick={onRetry}
        size="sm"
        className="bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </Button>
    </div>
  );
}

export function PageSkeleton({ kpis = 4, panels = 2 }: { kpis?: number; panels?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Loading data</span>
      <div className="flex flex-col gap-2 border-b border-border pb-5">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: kpis }).map((_, i) => (
          <div key={i} className="panel flex flex-col gap-2 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      {Array.from({ length: panels }).map((_, i) => (
        <div key={i} className="panel flex flex-col gap-3 p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
      ))}
    </div>
  );
}
