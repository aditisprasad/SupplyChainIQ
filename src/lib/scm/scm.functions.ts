// Thin server-function wrappers. All logic lives in the *.server.ts services.
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { DomainEventInput } from "../events/domain-event";
import { APP_ROLES, type AppRole } from "./types";

type EventDb = SupabaseClient<Database>;
const roleEnum = z.enum(APP_ROLES as [AppRole, ...AppRole[]]);

async function services() {
  return await import("./intelligence.server");
}

async function operations() {
  return await import("./operations.server");
}

async function queueEventsBestEffort(db: EventDb, events: DomainEventInput[]) {
  try {
    const { recordDomainEvents } = await import("../kafka/producer.server");
    await recordDomainEvents(db, events);
  } catch (error) {
    console.error("[domain-events] Event recording failed after a committed business action", {
      eventTypes: events.map((event) => event.eventType),
      workspaceId: events[0]?.workspaceId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function flushEventsBestEffort(db: EventDb, workspaceId: string) {
  try {
    const { retryPendingDomainEvents } = await import("../kafka/producer.server");
    await retryPendingDomainEvents(db, workspaceId);
  } catch (error) {
    console.error("[domain-events] Pending events remain queued for retry", {
      workspaceId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
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
    const result = await generateDemandForecasts(context.supabase, ws.id, data.productId);
    if (result.savedRows > 0) await flushEventsBestEffort(context.supabase, ws.id);
    return result;
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
    const result = await setAlertStatus(context.supabase, { ...data, userId: context.userId });
    if (data.status === "ACKNOWLEDGED") {
      const { getActiveWorkspace } = await services();
      const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
      await flushEventsBestEffort(context.supabase, ws.id);
    }
    return result;
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
    const result = await createReplenishmentOrder(context.supabase, {
      workspaceId: ws.id,
      inventoryPositionId: data.inventoryPositionId,
      quantityUnits: data.quantityUnits,
      userId: context.userId,
    });
    await flushEventsBestEffort(context.supabase, ws.id);
    return result;
  });

export const approveReplenishmentRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      recommendationId: z.string().regex(/^rec-\d+$/),
      inventoryPositionId: z.string().uuid(),
    }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { getActiveWorkspace, getRecommendations, createReplenishmentOrder } = await services();
    const { assertCanWrite } = await operations();
    await assertCanWrite(context.supabase, context.userId);
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    const recommendations = await getRecommendations(context.supabase, ws.id);
    const recommendation = recommendations.find(
      (item) =>
        item.id === data.recommendationId &&
        item.category === "REPLENISHMENT" &&
        item.inventoryPositionId === data.inventoryPositionId &&
        item.suggestedOrderUnits !== undefined,
    );
    if (!recommendation?.suggestedOrderUnits || !recommendation.inventoryPositionId) {
      throw new Error("This replenishment recommendation is no longer available in the active workspace.");
    }

    const result = await createReplenishmentOrder(context.supabase, {
      workspaceId: ws.id,
      inventoryPositionId: recommendation.inventoryPositionId,
      quantityUnits: recommendation.suggestedOrderUnits,
      userId: context.userId,
      status: "APPROVED",
    });
    await queueEventsBestEffort(context.supabase, [
      {
        workspaceId: ws.id,
        eventType: "recommendation.approved",
        entityType: "inventory_recommendation",
        entityId: recommendation.inventoryPositionId,
        payload: {
          recommendationId: recommendation.id,
          title: recommendation.title,
          purchaseOrderId: result.id,
        },
      },
      {
        workspaceId: ws.id,
        eventType: "purchase_order.created",
        entityType: "purchase_order",
        entityId: result.id,
        payload: {
          poNumber: result.poNumber,
          quantityUnits: result.quantityUnits,
          totalValueUsd: result.totalValueUsd,
          recommendationId: recommendation.id,
        },
      },
      {
        workspaceId: ws.id,
        eventType: "inventory.updated",
        entityType: "inventory_position",
        entityId: result.inventoryPositionId,
        payload: {
          reason: "recommendation_approved",
          purchaseOrderId: result.id,
          productId: result.productId,
          siteId: result.siteId,
          onOrderUnitsAdded: result.quantityUnits,
        },
      },
    ]);
    await flushEventsBestEffort(context.supabase, ws.id);
    return result;
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
    const result = await receivePurchaseOrder(context.supabase, {
      workspaceId: ws.id,
      purchaseOrderId: data.purchaseOrderId,
      userId: context.userId,
    });
    await flushEventsBestEffort(context.supabase, ws.id);
    return result;
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

export const fetchDomainEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace } = await services();
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    const { data, error } = await context.supabase
      .from("domain_events")
      .select("*")
      .eq("workspace_id", ws.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(`Event history lookup failed: ${error.message}`);
    const { getConsumerEventStatuses } = await import("../kafka/status.server");
    const consumerStatusData = await getConsumerEventStatuses(ws.id, data ?? []);
    return (data ?? []).map((event) => ({
      ...event,
      consumerStatus: consumerStatusData.statuses[event.event_id] ?? null,
      consumerStatusAvailable: consumerStatusData.available,
    }));
  });

export const previewProductSupplierMappings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ rows: z.array(z.record(z.string(), z.unknown())) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { getActiveWorkspace } = await services();
    const ws = await getActiveWorkspace(
      context.supabase,
      context.userId,
      context.activeWorkspaceId,
      context.isExplicitSwitch,
    );
    if (ws.is_demo) {
      throw new Error("Product-supplier mapping imports are disabled for the Northwind Demo workspace.");
    }

    const [products, suppliers, mappings] = await Promise.all([
      context.supabase
        .from("products")
        .select("id,sku,name,unit_cost")
        .eq("workspace_id", ws.id),
      context.supabase
        .from("suppliers")
        .select("id,code,name,lead_time_days")
        .eq("workspace_id", ws.id),
      context.supabase
        .from("product_suppliers")
        .select("product_id,supplier_id,is_primary,unit_cost,lead_time_days,moq")
        .eq("workspace_id", ws.id),
    ]);
    if (products.error) throw new Error(`Product lookup failed: ${products.error.message}`);
    if (suppliers.error) throw new Error(`Supplier lookup failed: ${suppliers.error.message}`);
    if (mappings.error) throw new Error(`Product-supplier mapping lookup failed: ${mappings.error.message}`);

    const productBySku = new Map((products.data ?? []).map((product) => [product.sku, product]));
    const supplierByCode = new Map((suppliers.data ?? []).map((supplier) => [supplier.code, supplier]));
    const supplierById = new Map((suppliers.data ?? []).map((supplier) => [supplier.id, supplier]));
    const mappingByPair = new Map(
      (mappings.data ?? []).map((mapping) => [`${mapping.product_id}:${mapping.supplier_id}`, mapping]),
    );
    const primaryByProduct = new Map(
      (mappings.data ?? [])
        .filter((mapping) => mapping.is_primary)
        .map((mapping) => [mapping.product_id, mapping]),
    );

    return data.rows.map((row, index) => {
      const sku = String(row["sku"] ?? "").trim();
      const supplierCode = String(row["supplier_code"] ?? "").trim();
      const product = productBySku.get(sku) ?? null;
      const supplier = supplierByCode.get(supplierCode) ?? null;
      const existingMapping =
        product && supplier ? mappingByPair.get(`${product.id}:${supplier.id}`) ?? null : null;
      const primaryMapping = product ? primaryByProduct.get(product.id) ?? null : null;
      const currentPrimarySupplier = primaryMapping
        ? supplierById.get(primaryMapping.supplier_id) ?? null
        : null;

      return {
        row: index + 1,
        sku,
        supplierCode,
        product: product ? { sku: product.sku, name: product.name } : null,
        supplier: supplier ? { code: supplier.code, name: supplier.name } : null,
        relationshipUnitCost:
          row["unit_cost"] === undefined || row["unit_cost"] === ""
            ? product?.unit_cost ?? null
            : row["unit_cost"],
        relationshipLeadTimeDays:
          row["lead_time_days"] === undefined || row["lead_time_days"] === ""
            ? supplier?.lead_time_days ?? null
            : row["lead_time_days"],
        moq: row["moq"] ?? null,
        isPrimary: row["is_primary"] ?? null,
        existingMapping: existingMapping
          ? {
              isPrimary: existingMapping.is_primary,
              unitCost: existingMapping.unit_cost,
              leadTimeDays: existingMapping.lead_time_days,
              moq: existingMapping.moq,
            }
          : null,
        currentPrimarySupplier: currentPrimarySupplier
          ? { code: currentPrimarySupplier.code, name: currentPrimarySupplier.name }
          : null,
      };
    });
  });

export const retryDomainEventDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getActiveWorkspace } = await services();
    const { assertCanWrite } = await operations();
    await assertCanWrite(context.supabase, context.userId);
    const ws = await getActiveWorkspace(context.supabase, context.userId, context.activeWorkspaceId, context.isExplicitSwitch);
    const { retryPendingDomainEvents } = await import("../kafka/producer.server");
    return retryPendingDomainEvents(context.supabase, ws.id);
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
