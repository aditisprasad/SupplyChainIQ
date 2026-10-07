// Thin server-function wrappers. All logic lives in the *.server.ts services.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { APP_ROLES, type AppRole } from "./types";

const roleEnum = z.enum(APP_ROLES as [AppRole, ...AppRole[]]);

async function services() {
  return await import("./intelligence.server");
}

async function operations() {
  return await import("./operations.server");
}

// ---------------------------------------------------------------- SESSION
export const fetchSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getSessionContext } = await import("./session.server");
    return getSessionContext(
      context.supabase,
      context.userId,
      String((context.claims as Record<string, any>)['email'] ?? ""),
      context.activeWorkspaceId,
      context.isExplicitSwitch,
    );
  });

export const updateMyRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ roles: z.array(roleEnum).min(1) }).parse(data))
  .handler(async ({ context, data }) => {
    const { setMyRoles, getSessionContext } = await import("./session.server");
    await setMyRoles(context.supabase, data.roles);
    return getSessionContext(
      context.supabase,
      context.userId,
      String((context.claims as Record<string, any>)['email'] ?? ""),
      context.activeWorkspaceId,
      context.isExplicitSwitch,
    );
  });

// ---------------------------------------------------------------- WORKSPACES
export const fetchWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: memberRows, error: membershipError } = await context.supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", context.userId);
    if (membershipError) throw new Error(`Workspace membership lookup failed: ${membershipError.message}`);

    const userWsIds = (memberRows ?? []).map((m) => m.workspace_id);

    const { data, error } = await context.supabase
      .from("workspaces")
      .select("id,name,slug,industry,is_demo,created_at")
      .eq("is_demo", false)
      .order("is_demo", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).filter((w) => userWsIds.includes(w.id));
  });

export const switchWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ workspaceId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: ws, error } = await context.supabase
      .from("workspaces")
      .select("id,name,is_demo")
      .eq("id", data.workspaceId)
      .maybeSingle();
    if (error || !ws || ws.is_demo) throw new Error("Workspace not found or not accessible");
    return { workspaceId: ws.id, workspaceName: ws.name, isDemo: ws.is_demo };
  });

// ---------------------------------------------------------------- INTELLIGENCE
export const fetchOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace, getOverview } = await services();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return getOverview(context.supabase, ws.id);
  });

export const fetchDemand = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ productId: z.string().uuid().optional() }).parse(data ?? {}))
  .handler(async ({ context, data }) => {
    const { getActiveWorkspace, getDemandIntelligence } = await services();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return getDemandIntelligence(context.supabase, ws.id, data.productId);
  });

export const runDemandForecast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ productId: z.string().uuid().optional() }).parse(data ?? {}))
  .handler(async ({ context, data }) => {
    const { getActiveWorkspace, generateDemandForecasts } = await services();
    const { assertCanWrite } = await operations();
    await assertCanWrite(context.supabase, context.userId);
    const ws = await getActiveWorkspace(
      context.supabase,
      context.userId,
      context.activeWorkspaceId,
      context.isExplicitSwitch,
    );
    return generateDemandForecasts(context.supabase, ws.id, data.productId);
  });

export const fetchInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace, getInventoryHealth } = await services();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return getInventoryHealth(context.supabase, ws.id);
  });

export const fetchSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace, getSupplierIntelligence } = await services();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return getSupplierIntelligence(context.supabase, ws.id);
  });

export const fetchLogistics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace, getLogisticsPerformance } = await services();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return getLogisticsPerformance(context.supabase, ws.id);
  });

export const fetchAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional() }).parse(data ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { getActiveWorkspace, getAlerts } = await services();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return getAlerts(context.supabase, ws.id, data.status);
  });

export const updateAlertStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        alertId: z.string().uuid(),
        status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { setAlertStatus } = await services();
    const { assertCanWrite } = await operations();
    await assertCanWrite(context.supabase, context.userId);
    return setAlertStatus(context.supabase, { ...data, userId: context.userId });
  });

export const createReplenishment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        inventoryPositionId: z.string().uuid(),
        quantityUnits: z.number().int().positive().max(1_000_000),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { getActiveWorkspace, createReplenishmentOrder } = await services();
    const { assertCanWrite } = await operations();
    await assertCanWrite(context.supabase, context.userId);
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return createReplenishmentOrder(context.supabase, {
      workspaceId: ws.id,
      inventoryPositionId: data.inventoryPositionId,
      quantityUnits: data.quantityUnits,
      userId: context.userId,
    });
  });

export const fetchPurchaseOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace, getPurchaseOrders } = await services();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return getPurchaseOrders(context.supabase, ws.id);
  });

export const globalSearch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ term: z.string().max(120) }).parse(data))
  .handler(async ({ context, data }) => {
    const { getActiveWorkspace } = await services();
    const { searchWorkspace } = await operations();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return searchWorkspace(context.supabase, ws.id, data.term);
  });

export const fetchNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace } = await services();
    const { getNotifications } = await operations();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return getNotifications(context.supabase, ws.id);
  });

export const receivePo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ purchaseOrderId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { getActiveWorkspace } = await services();
    const { receivePurchaseOrder } = await operations();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return receivePurchaseOrder(context.supabase, {
      workspaceId: ws.id,
      purchaseOrderId: data.purchaseOrderId,
      userId: context.userId,
    });
  });

export const exportCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        dataset: z.enum([
          "inventory",
          "suppliers",
          "shipments",
          "purchase_orders",
          "forecast_accuracy",
          "alerts",
        ]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { getActiveWorkspace } = await services();
    const { exportDataset } = await operations();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return exportDataset(context.supabase, ws.id, data.dataset);
  });

export const fetchImportHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace } = await services();
    const { getImportHistory } = await import("./ingestion.server");
    try {
      const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
      return { records: await getImportHistory(context.supabase, ws.id), error: null };
    } catch (error) {
      return {
        records: [],
        error: error instanceof Error ? error.message : "Unable to load import history.",
      };
    }
  });

export const processDataImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        dataset: z.string(),
        filename: z.string(),
        rows: z.array(z.record(z.unknown())),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { getActiveWorkspace } = await services();
    const { executeDatasetImport } = await import("./ingestion.server");
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    if (ws.is_demo) {
      throw new Error("Imports are disabled for the Northwind Demo workspace. Switch to your organization workspace.");
    }
    return executeDatasetImport(context.supabase, {
      workspaceId: ws.id,
      dataset: data.dataset,
      filename: data.filename,
      rows: data.rows,
      userId: context.userId,
    });
  });

export const fetchProcurementIntelligence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace, getProcurementIntelligence } = await services();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return getProcurementIntelligence(context.supabase, ws.id);
  });

export const fetchAiDecisionIntelligence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace, getAiDecisionIntelligence } = await services();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    return getAiDecisionIntelligence(context.supabase, ws.id);
  });

export const fetchRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace, getRecommendations } = await services();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId);
    return getRecommendations(context.supabase, ws.id);
  });
