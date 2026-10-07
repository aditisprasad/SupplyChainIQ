import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusPill, usd, dateLabel } from "@/components/scm/primitives";
import { notificationsQuery } from "@/lib/scm/queries";

export function AlertBell() {
  const { data } = useQuery(notificationsQuery);
  const count = data?.openCount ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative px-2"
          aria-label={`Open alerts: ${count}`}
        >
          <Bell className="size-4" />
          {count > 0 ? (
            <span className="absolute -right-1 -top-1 flex min-w-4 justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-accent-foreground">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-xs font-semibold tracking-[0.1em] text-foreground">OPEN ALERTS</p>
          <Link to="/alerts" className="text-[11px] text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {(data?.items ?? []).length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Nothing open — the network is clear.
            </p>
          ) : (
            (data?.items ?? []).map((item) => (
              <div key={item.id} className="border-b border-border/60 px-3 py-2 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">{item.title}</p>
                  <StatusPill value={item.severity} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.module} · {dateLabel(item.createdAt)}
                  {item.impactUsd ? ` · ${usd(item.impactUsd)} at risk` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
