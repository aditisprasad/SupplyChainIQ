// Cross-cutting operational services: authorization, global search, purchase
// order receiving and dataset exports. Server-only.
import type { Db } from "./intelligence.server";
import {
  getAlerts,
  getInventoryHealth,
  getLogisticsPerformance,
  getPurchaseOrders,
  getSupplierIntelligence,
  getDemandIntelligence,
} from "./intelligence.server";
import { WRITE_ROLES } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Authorization gate for every operational write. Row-level security already
 * blocks the write, but this produces an explicit, readable failure and keeps
 * the rule in one place instead of relying on a database error string.
 */
export async function assertCanWrite(db: Db, userId: string) {
  const res = await (db as any).rpc("has_any_role", {
    _user_id: userId,
    _roles: WRITE_ROLES,
  });
  if (res.error) throw new Error(res.error.message);
  if (res.data !== true) {
    throw new Error(
      "Your assigned roles are read-only. Administrator, Supply Chain Manager or Procurement Manager access is required for this action.",
    );
  }
}

// ----------------------------------------------------------------- SEARCH
export type SearchHit = {
  id: string;
  group: "Products" | "Suppliers" | "Shipments" | "Purchase orders" | "Alerts";
  label: string;
  detail: string;
  to: string;
};

export async function searchWorkspace(db: Db, workspaceId: string, termRaw: string) {
  const term = termRaw.trim();
  if (term.length < 2) return [] as SearchHit[];
  const like = `%${term}%`;

  const [products, suppliers, shipments, pos, alerts] = await Promise.all([
    db
      .from("products")
      .select("id,sku,name,category,abc_class")
      .eq("workspace_id", workspaceId)
      .or(`sku.ilike.${like},name.ilike.${like},category.ilike.${like}`)
      .limit(6),
    db
      .from("suppliers")
      .select("id,code,name,category,country")
      .eq("workspace_id", workspaceId)
      .or(`code.ilike.${like},name.ilike.${like},category.ilike.${like}`)
      .limit(6),
    db
      .from("shipments")
      .select("id,shipment_ref,carrier,lane,status")
      .eq("workspace_id", workspaceId)
      .or(`shipment_ref.ilike.${like},carrier.ilike.${like},lane.ilike.${like}`)
      .limit(6),
    db
      .from("purchase_orders")
      .select("id,po_number,status,total_value_usd")
      .eq("workspace_id", workspaceId)
      .ilike("po_number", like)
      .limit(6),
    db
      .from("alerts")
      .select("id,title,module,severity,status")
      .eq("workspace_id", workspaceId)
      .or(`title.ilike.${like},module.ilike.${like}`)
      .limit(6),
  ]);

  const hits: SearchHit[] = [];
  for (const p of products.data ?? [])
    hits.push({
      id: p.id,
      group: "Products",
      label: `${p.sku} · ${p.name}`,
      detail: `${p.category} · class ${p.abc_class}`,
      to: "/inventory",
    });
  for (const s of suppliers.data ?? [])
    hits.push({
      id: s.id,
      group: "Suppliers",
      label: `${s.code} · ${s.name}`,
      detail: `${s.category} · ${s.country}`,
      to: "/suppliers",
    });
  for (const s of shipments.data ?? [])
    hits.push({
      id: s.id,
      group: "Shipments",
      label: s.shipment_ref,
      detail: `${s.carrier} · ${s.lane} · ${s.status}`,
      to: "/logistics",
    });
  for (const p of pos.data ?? [])
    hits.push({
      id: p.id,
      group: "Purchase orders",
      label: p.po_number,
      detail: `${p.status} · ${Number(p.total_value_usd).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })}`,
      to: "/reports",
    });
  for (const a of alerts.data ?? [])
    hits.push({
      id: a.id,
      group: "Alerts",
      label: a.title,
      detail: `${a.module} · ${a.severity} · ${a.status}`,
      to: "/alerts",
    });

  return hits;
}

// ---------------------------------------------------------- NOTIFICATIONS
export async function getNotifications(db: Db, workspaceId: string) {
  const res = await db
    .from("alerts")
    .select("id,title,module,severity,created_at,impact_usd")
    .eq("workspace_id", workspaceId)
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(8);
  if (res.error) throw new Error(res.error.message);

  const counts = await db
    .from("alerts")
    .select("severity", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("status", "OPEN");
  if (counts.error) throw new Error(counts.error.message);

  return {
    openCount: counts.count ?? 0,
    items: (res.data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      module: a.module,
      severity: a.severity,
      createdAt: a.created_at,
      impactUsd: a.impact_usd == null ? null : Number(a.impact_usd),
    })),
  };
}

// ------------------------------------------------------- PO RECEIVING (DM)
/**
 * Receives an open purchase order: closes the order, records received
 * quantities on every line and moves the units from on-order to on-hand for
 * the matching stock position.
 */
export async function receivePurchaseOrder(
  db: Db,
  input: { workspaceId: string; purchaseOrderId: string; userId: string },
) {
  await assertCanWrite(db, input.userId);

  const po = await db
    .from("purchase_orders")
    .select("id,po_number,status,site_id,workspace_id")
    .eq("id", input.purchaseOrderId)
    .maybeSingle();
  if (po.error) throw new Error(po.error.message);
  if (!po.data) throw new Error("Purchase order not found");
  if (po.data.status === "RECEIVED") throw new Error("This purchase order is already received");

  const lines = await db
    .from("purchase_order_lines")
    .select("id,product_id,quantity_units,received_units")
    .eq("purchase_order_id", po.data.id);
  if (lines.error) throw new Error(lines.error.message);

  let unitsReceived = 0;
  const inventoryPositionIds: string[] = [];
  for (const line of lines.data ?? []) {
    const outstanding = line.quantity_units - line.received_units;
    if (outstanding <= 0) continue;
    unitsReceived += outstanding;

    const lineUpdate = await db
      .from("purchase_order_lines")
      .update({ received_units: line.quantity_units })
      .eq("id", line.id);
    if (lineUpdate.error) throw new Error(lineUpdate.error.message);

    const pos = await db
      .from("inventory_positions")
      .select("id,on_hand_units,on_order_units")
      .eq("workspace_id", input.workspaceId)
      .eq("product_id", line.product_id)
      .eq("site_id", po.data.site_id)
      .maybeSingle();
    if (pos.error) throw new Error(pos.error.message);
    if (!pos.data) continue;

    const move = await db
      .from("inventory_positions")
      .update({
        on_hand_units: pos.data.on_hand_units + outstanding,
        on_order_units: Math.max(0, pos.data.on_order_units - outstanding),
        updated_at: new Date().toISOString(),
      })
      .eq("id", pos.data.id);
    if (move.error) throw new Error(move.error.message);
    inventoryPositionIds.push(pos.data.id);
  }

  const close = await db
    .from("purchase_orders")
    .update({ status: "RECEIVED", received_date: new Date().toISOString().slice(0, 10) })
    .eq("id", po.data.id)
    .select("po_number")
    .maybeSingle();
  if (close.error) throw new Error(close.error.message);
  if (!close.data) throw new Error("Purchase order could not be updated");

  return {
    purchaseOrderId: po.data.id,
    poNumber: close.data.po_number,
    unitsReceived,
    inventoryPositionIds,
  };
}

// ------------------------------------------------------------- CSV EXPORT
export const DATASETS = [
  "inventory",
  "suppliers",
  "shipments",
  "purchase_orders",
  "forecast_accuracy",
  "alerts",
] as const;
export type DatasetKey = (typeof DATASETS)[number];

function csv(rows: Array<Record<string, unknown>>, columns: string[]) {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => escape(r[c])).join(","))].join(
    "\n",
  );
}

export async function exportDataset(db: Db, workspaceId: string, dataset: DatasetKey) {
  const stamp = new Date().toISOString().slice(0, 10);

  if (dataset === "inventory") {
    const d = await getInventoryHealth(db, workspaceId);
    const cols = [
      "sku",
      "productName",
      "siteCode",
      "region",
      "onHand",
      "onOrder",
      "safetyStock",
      "reorderPoint",
      "coverDays",
      "status",
      "valueUsd",
      "suggestedOrderUnits",
    ];
    return {
      filename: `inventory-positions-${stamp}.csv`,
      rowCount: d.rows.length,
      csv: csv(d.rows as unknown as Array<Record<string, unknown>>, cols),
    };
  }

  if (dataset === "suppliers") {
    const d = await getSupplierIntelligence(db, workspaceId);
    const cols = [
      "code",
      "name",
      "category",
      "tier",
      "country",
      "region",
      "status",
      "leadTimeDays",
      "onTimeDeliveryRate",
      "defectRatePpm",
      "riskScore",
      "riskBand",
      "annualSpendUsd",
      "openPoCount",
      "openPoValueUsd",
      "contractExpiry",
    ];
    return {
      filename: `supplier-scorecard-${stamp}.csv`,
      rowCount: d.rows.length,
      csv: csv(d.rows as unknown as Array<Record<string, unknown>>, cols),
    };
  }

  if (dataset === "shipments") {
    const d = await getLogisticsPerformance(db, workspaceId);
    const cols = [
      "ref",
      "poNumber",
      "supplierName",
      "carrier",
      "mode",
      "origin",
      "destination",
      "lane",
      "status",
      "shipDate",
      "etaDate",
      "arrivalDate",
      "delayDays",
      "units",
      "freightCostUsd",
      "costPerUnitUsd",
    ];
    return {
      filename: `shipments-${stamp}.csv`,
      rowCount: d.rows.length,
      csv: csv(d.rows as unknown as Array<Record<string, unknown>>, cols),
    };
  }

  if (dataset === "purchase_orders") {
    const rows = await getPurchaseOrders(db, workspaceId);
    const cols = [
      "poNumber",
      "supplierName",
      "siteCode",
      "status",
      "orderDate",
      "promisedDate",
      "receivedDate",
      "totalValueUsd",
    ];
    return {
      filename: `purchase-orders-${stamp}.csv`,
      rowCount: rows.length,
      csv: csv(rows as unknown as Array<Record<string, unknown>>, cols),
    };
  }

  if (dataset === "forecast_accuracy") {
    const d = await getDemandIntelligence(db, workspaceId);
    const cols = [
      "sku",
      "name",
      "category",
      "abcClass",
      "lifecycle",
      "accuracyPct",
      "mapePct",
      "biasPct",
      "trailing6mUnits",
      "next6mUnits",
      "next6mRevenueUsd",
    ];
    return {
      filename: `forecast-accuracy-${stamp}.csv`,
      rowCount: d.accuracyByProduct.length,
      csv: csv(d.accuracyByProduct as unknown as Array<Record<string, unknown>>, cols),
    };
  }

  const rows = await getAlerts(db, workspaceId);
  const cols = ["module", "severity", "status", "title", "detail", "impactUsd", "createdAt"];
  return {
    filename: `alerts-${stamp}.csv`,
    rowCount: rows.length,
    csv: csv(rows as unknown as Array<Record<string, unknown>>, cols),
  };
}
