import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchQuery } from "@/lib/scm/queries";
import type { SearchHit } from "@/lib/scm/search-types";

const MODULE_SHORTCUTS: SearchHit[] = [
  { id: "n1", group: "Modules", label: "Command Center", detail: "Executive overview", to: "/dashboard" },
  { id: "n2", group: "Modules", label: "Demand & Forecast", detail: "Forecast accuracy", to: "/demand" },
  { id: "n3", group: "Modules", label: "Stock Health", detail: "Positions & replenishment", to: "/inventory" },
  { id: "n4", group: "Modules", label: "Suppliers & Risk", detail: "Scorecards", to: "/suppliers" },
  { id: "n5", group: "Modules", label: "Shipments", detail: "Lanes & carriers", to: "/logistics" },
  { id: "n6", group: "Modules", label: "Alert Desk", detail: "Open exceptions", to: "/alerts" },
  { id: "n7", group: "Modules", label: "Reports & Exports", detail: "Purchase orders, CSV", to: "/reports" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: hits = [], isFetching } = useQuery(searchQuery(term));

  const grouped = new Map<string, SearchHit[]>();
  const source = term.trim().length >= 2 ? hits : MODULE_SHORTCUTS;
  for (const hit of source) {
    const list = grouped.get(hit.group) ?? [];
    list.push(hit);
    grouped.set(hit.group, list);
  }

  function go(to: string) {
    setOpen(false);
    setTerm("");
    navigate({ to });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the workspace"
        className="flex h-8 items-center gap-2 rounded-md border border-input bg-background/60 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Search className="size-3.5" />
        <span className="hidden md:inline">Search SKUs, suppliers, shipments…</span>
        <kbd className="hidden rounded border border-border px-1 py-0.5 text-[10px] font-medium md:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={term}
          onValueChange={setTerm}
          placeholder="Search SKUs, suppliers, shipments, orders, alerts…"
        />
        <CommandList>
          <CommandEmpty>
            {term.trim().length < 2
              ? "Type at least two characters."
              : isFetching
                ? "Searching…"
                : "No matches in this workspace."}
          </CommandEmpty>
          {[...grouped.entries()].map(([group, items]) => (
            <CommandGroup key={group} heading={group}>
              {items.map((hit) => (
                <CommandItem
                  key={hit.id}
                  value={`${hit.group} ${hit.label} ${hit.detail}`}
                  onSelect={() => go(hit.to)}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="truncate text-foreground">{hit.label}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{hit.detail}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
