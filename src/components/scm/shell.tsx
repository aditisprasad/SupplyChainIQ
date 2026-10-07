import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Factory,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Truck,
  TrendingUp,
  Upload,
  Sparkles,
  SlidersHorizontal,
  DollarSign,
  Inbox,
  Radio,
  ChevronRight,
  ChevronLeft,
  Database,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { AlertBell } from "@/components/scm/alert-bell";
import { CommandPalette } from "@/components/scm/command-palette";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { switchWorkspace, updateMyRoles } from "@/lib/scm/scm.functions";
import { workspacesQuery } from "@/lib/scm/queries";
import { APP_ROLES, ROLE_LABELS, type AppRole, type SessionContext } from "@/lib/scm/types";

const NAV_GROUPS = [
  {
    category: "COMMAND",
    items: [{ to: "/dashboard", label: "Control Tower", icon: LayoutDashboard }],
  },
  {
    category: "OPERATIONS",
    items: [
      { to: "/inventory", label: "Inventory Control", icon: Boxes },
      { to: "/demand", label: "Demand Planning", icon: TrendingUp },
      { to: "/suppliers", label: "Supplier Network", icon: Factory },
      { to: "/logistics", label: "Logistics Tower", icon: Truck },
    ],
  },
  {
    category: "PROCUREMENT",
    items: [{ to: "/procurement", label: "Procurement Control", icon: DollarSign }],
  },
  {
    category: "INTELLIGENCE",
    items: [
      { to: "/ai-decision", label: "Decision Room", icon: Sparkles },
      { to: "/what-if", label: "Scenario Lab", icon: SlidersHorizontal },
      { to: "/recommendations", label: "Decision Inbox", icon: Inbox },
      { to: "/alerts", label: "Incident Desk", icon: AlertTriangle },
    ],
  },
  {
    category: "DATA PIPELINE",
    items: [
      { to: "/data", label: "Pipeline Control", icon: Upload },
      { to: "/reports", label: "Reports & Exports", icon: FileSpreadsheet },
    ],
  },
] as const;

export function AppShell({
  session,
  children,
}: {
  session: SessionContext;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saveRoles = useServerFn(updateMyRoles);
  const runSwitchWorkspace = useServerFn(switchWorkspace);
  const { data: workspacesList } = useQuery(workspacesQuery);
  const [collapsed, setCollapsed] = useState(false);

  const rolesMutation = useMutation({
    mutationFn: (roles: AppRole[]) => saveRoles({ data: { roles } }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Access profile updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const switchWorkspaceMutation = useMutation({
    mutationFn: (workspaceId: string) => runSwitchWorkspace({ data: { workspaceId } }),
    onSuccess: (res) => {
      document.cookie = `scm_active_ws=${res.workspaceId}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `scm_explicit_ws=true; path=/; max-age=31536000; SameSite=Lax`;
      queryClient.invalidateQueries();
      toast.success(`Switched to ${res.workspaceName}`, {
        description: "Organization workspace selected",
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function signOut() {
    document.cookie = "scm_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "scm_active_ws=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie = "scm_explicit_ws=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!session || !session.workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="flex items-center gap-3 text-slate-300 text-sm font-mono">
          <span className="size-2 rounded-full bg-primary animate-ping" />
          Initializing SupplyChainIQ Control Tower...
        </div>
      </div>
    );
  }

  const userRoles = session.roles ?? ["ADMIN"];
  const workspaceAvailable = Boolean(session.workspace.id);

  function toggleRole(role: AppRole) {
    const next = userRoles.includes(role)
      ? userRoles.filter((r) => r !== role)
      : [...userRoles, role];
    if (next.length === 0) {
      toast.error("Keep at least one role assigned");
      return;
    }
    rolesMutation.mutate(next);
  }

  const initials = (session.fullName ?? session.email ?? "User")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground">
      {/* CONTROL TOWER COMPACT SIDE RAIL */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/80 bg-slate-950 text-slate-200 transition-all duration-300 lg:flex ${collapsed ? "w-16" : "w-56"
          }`}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between px-3.5 border-b border-slate-800">
          <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex size-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground shadow-xs">
              <Activity className="size-4" />
            </div>
            {!collapsed ? (
              <div className="flex flex-col truncate">
                <span className="font-display text-xs font-bold tracking-wider text-white">
                  SUPPLYCHAIN<span className="text-primary">IQ</span>
                </span>
                <span className="num text-[8px] font-mono text-slate-400 uppercase tracking-widest">
                  CONTROL TOWER
                </span>
              </div>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title={collapsed ? "Expand rail" : "Collapse rail"}
          >
            {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
          </button>
        </div>

        {/* Navigation Rail */}
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.category} className="space-y-1">
              {!collapsed ? (
                <p className="px-2.5 text-[9px] font-bold uppercase tracking-widest font-mono text-slate-500">
                  {group.category}
                </p>
              ) : null}
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group relative flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition-all hover:bg-slate-800/80 hover:text-white data-[status=active]:bg-slate-800 data-[status=active]:text-primary data-[status=active]:font-bold"
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="size-4 shrink-0 transition-transform group-hover:scale-105" />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  {/* Left indicator bar for active item */}
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary opacity-0 group-data-[status=active]:opacity-100 rounded-r" />
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Workspace Footer */}
        <div className="border-t border-slate-800 p-3 text-xs bg-slate-900/80 text-slate-400">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full text-left rounded p-1 hover:bg-slate-800/80 transition-colors focus:outline-hidden"
              >
                {!collapsed ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white truncate text-[11px] flex items-center gap-1.5">
                        <Layers className="size-3 text-primary shrink-0" />
                        <span className="truncate">{session.workspace.name}</span>
                      </p>
                      <span
                        className={`size-1.5 rounded-full shrink-0 ${session.workspace.isDemo ? "bg-amber-400" : workspaceAvailable ? "bg-teal-400" : "bg-rose-400"}`}
                        title={session.workspace.isDemo ? "Demo Workspace Active" : workspaceAvailable ? "Organization Workspace Resolved" : "Workspace Unavailable"}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="truncate">{session.workspace.isDemo ? "Demo Dataset" : workspaceAvailable ? "Organization Workspace" : "Unavailable"}</span>
                      <span className="text-primary font-bold">{workspaceAvailable ? "Switch ▾" : ""}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center" title={`${session.workspace.name} (${session.workspace.industry})`}>
                    <span className={`size-2 rounded-full ${session.workspace.isDemo ? "bg-amber-400" : workspaceAvailable ? "bg-teal-400" : "bg-rose-400"}`} />
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-slate-900 text-slate-200 border-slate-800">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">
                Workspaces
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              {(workspacesList ?? []).map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  disabled={switchWorkspaceMutation.isPending}
                  onClick={() => switchWorkspaceMutation.mutate(ws.id)}
                  className={`flex flex-col items-start gap-0.5 text-xs focus:bg-slate-800 focus:text-white cursor-pointer ${ws.id === session.workspace.id ? "bg-slate-800/80 text-primary font-bold" : ""
                    }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate">{ws.name}</span>
                    {ws.is_demo ? (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                        DEMO
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold">
                        LIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{ws.industry}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* MAIN OPERATIONAL CANVAS */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* OPERATIONAL TOP STATUS BAR */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-md lg:px-6">
          {/* Mobile Navigation Row */}
          <nav className="flex gap-1 overflow-x-auto lg:hidden py-1">
            {NAV_GROUPS.flatMap((g: any) => g.items).map((item: any) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap rounded px-2.5 py-1 text-xs font-semibold text-muted-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Operational Telemetry Bar */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 rounded bg-slate-900 px-2.5 py-1 text-slate-200 text-[11px] border border-slate-800">
              <Radio className={`size-3 ${workspaceAvailable ? "text-teal-400 animate-pulse" : "text-rose-400"}`} />
              <span className="font-bold">GLOBAL SUPPLY NETWORK</span>
              <span className={`font-bold ${workspaceAvailable ? "text-teal-400" : "text-rose-400"}`}>
                {workspaceAvailable ? "● WORKSPACE SELECTED" : "● WORKSPACE UNAVAILABLE"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
              <Database className={`size-3 ${workspaceAvailable ? "text-primary" : "text-rose-400"}`} />
              <span>{workspaceAvailable ? "WORKSPACE CONTEXT: RESOLVED" : "WORKSPACE CONTEXT: UNAVAILABLE"}</span>
            </div>

            <span className="text-border">|</span>

            <span className="text-[11px] text-muted-foreground">
              {userRoles.map((r) => ROLE_LABELS[r] ?? r).join(" · ")}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <CommandPalette />
            <AlertBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold h-8">
                  <span className="flex size-5 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">
                    {initials}
                  </span>
                  <span className="hidden max-w-[140px] truncate sm:inline">{session.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  <p className="font-semibold text-foreground">{session.fullName ?? session.email}</p>
                  {session.jobTitle ? <p className="text-[11px] font-mono">{session.jobTitle}</p> : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider font-mono text-muted-foreground">
                  Assigned Roles
                </DropdownMenuLabel>
                {APP_ROLES.map((role) => (
                  <DropdownMenuCheckboxItem
                    key={role}
                    checked={userRoles.includes(role)}
                    disabled={rolesMutation.isPending}
                    onCheckedChange={() => toggleRole(role)}
                    className="text-xs"
                  >
                    {ROLE_LABELS[role]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="sm" onClick={signOut} className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8">
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </header>

        {/* MAIN BODY ROUTE CANVAS */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
