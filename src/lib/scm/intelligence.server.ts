// Server-side supply-chain intelligence services.
// All business logic lives here; server functions are thin wrappers and React
// components only render the returned DTOs.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  avgDelayDays,
  bias,
  coverDays,
  forecastAccuracy,
  inventoryTurns,
  mape,
  monthLabel,
  otifRate,
  riskBand,
  round,
  stockStatus,
  supplierRiskScore,
  supplierStatus,
  type StockStatus,
} from "./calc";

export type Db = SupabaseClient<Database>;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) {
    throw new Error(`[intelligence.server] Database query failed: ${res.error.message}`);
  }
  if (res.data === null) throw new Error("[intelligence.server] Database query returned no response data.");
  return res.data;
}

export async function ensureDefaultSite(db: Db, workspaceId: string) {
  const { data: existing, error } = await db
    .from("sites")
    .select("id, code")
    .eq("workspace_id", workspaceId)
    .eq("code", "DC-MAIN")
    .maybeSingle();

  if (error) throw new Error(`Workspace site lookup failed: ${error.message}`);
  if (!existing) throw new Error("Workspace has no DC-MAIN site record.");
  return existing;
}

export async function getActiveWorkspace(
  db: Db,
  userId?: string,
  preferredWorkspaceId?: string,
  isExplicitSwitch?: boolean,
) {
  if (!userId) throw new Error("Authenticated user is required to resolve a workspace.");

  // 1. If explicit preferredWorkspaceId is requested (e.g. user selected workspace), verify & return it
  if (preferredWorkspaceId) {
    const res = await db
      .from("workspaces")
      .select("id,name,industry,currency,is_demo")
      .eq("id", preferredWorkspaceId)
      .eq("is_demo", false)
      .maybeSingle();

    if (res.data) {
      if (!res.data.is_demo) {
        // For customer workspace, verify user membership if userId provided
        const { data: member } = await db
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", preferredWorkspaceId)
          .eq("user_id", userId)
          .maybeSingle();

        if (member) {
          await ensureDefaultSite(db, res.data.id);
          return res.data;
        }
      }
    }
  }

  // 2. Fetch customer workspace specific to this authenticated user via workspace_members
  if (userId) {
    const { data: userMemberships, error: membershipError } = await db
      .from("workspace_members")
      .select("workspace_id, workspaces!inner(id, name, industry, currency, is_demo, created_at)")
      .eq("user_id", userId);

    if (membershipError) throw new Error(`Workspace membership lookup failed: ${membershipError.message}`);

    if (userMemberships && userMemberships.length > 0) {
      const customerWsList = userMemberships
        .map((m: any) => m.workspaces)
        .filter((w: any) => w && !w.is_demo)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (customerWsList.length > 0) {
        const activeWs = customerWsList[0];
        await ensureDefaultSite(db, activeWs.id);
        return activeWs;
      }
    }

    // 3. User has no customer workspace yet — invoke SECURITY DEFINER RPC to auto-provision
    const bootstrap = await (db as any).rpc("bootstrap_current_user", {});
    if (bootstrap.error) {
      const error = bootstrap.error;
      throw new Error(
        `Workspace bootstrap failed${error.code ? ` [${error.code}]` : ""}: ${error.message}` +
        (error.details ? `; details: ${error.details}` : "") +
        (error.hint ? `; hint: ${error.hint}` : ""),
      );
    }

    const { data: recheckMemberships, error: recheckError } = await db
      .from("workspace_members")
      .select("workspace_id, workspaces!inner(id, name, industry, currency, is_demo, created_at)")
      .eq("user_id", userId);

    if (recheckError) throw new Error(`Workspace membership lookup failed after bootstrap: ${recheckError.message}`);

    if (recheckMemberships && recheckMemberships.length > 0) {
      const customerWsList = recheckMemberships
        .map((m: any) => m.workspaces)
        .filter((w: any) => w && !w.is_demo)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (customerWsList.length > 0) {
        const activeWs = customerWsList[0];
        await ensureDefaultSite(db, activeWs.id);
        return activeWs;
      }
    }
  }

  throw new Error("No verified organization workspace is available for this user.");
}

// ---------------------------------------------------------------- OVERVIEW
export async function getOverview(db: Db, workspaceId: string) {
  const [inventory, products, suppliers, shipments, forecasts, demand, alerts, pos, sites] =
    await Promise.all([
      db
        .from("inventory_positions")
        .select("on_hand_units,on_order_units,safety_stock_units,reorder_point_units,avg_daily_demand,product_id")
        .eq("workspace_id", workspaceId),
      db.from("products").select("id,sku,unit_cost,unit_price").eq("workspace_id", workspaceId),
      db
        .from("suppliers")
        .select(
          "id,name,on_time_delivery_rate,defect_rate_ppm,financial_risk_score,geopolitical_risk_score,capacity_risk_score,annual_spend_usd,status",
        )
        .eq("workspace_id", workspaceId),
      db
        .from("shipments")
        .select("status,eta_date,actual_arrival_date,freight_cost_usd,units,mode")
        .eq("workspace_id", workspaceId),
      db
        .from("demand_forecasts")
        .select("forecast_units,actual_units,period_month")
        .eq("workspace_id", workspaceId),
      db.from("demand_history").select("product_id,units,revenue_usd,period_month").eq("workspace_id", workspaceId),
      db.from("alerts").select("severity,status,impact_usd,module,title,detail").eq("workspace_id", workspaceId),
      db.from("purchase_orders").select("status,total_value_usd").eq("workspace_id", workspaceId),
      db.from("sites").select("id,site_type").eq("workspace_id", workspaceId),
    ]);

  const inv = unwrap(inventory);
  const prods = unwrap(products);
  const sups = unwrap(suppliers);
  const ships = unwrap(shipments);
  const fcs = unwrap(forecasts);
  const hist = unwrap(demand);
  const alertRows = unwrap(alerts);
  const poRows = unwrap(pos);
  const siteRows = unwrap(sites);

  const costBySku = new Map(prods.map((p) => [p.id, Number(p.unit_cost)]));
  const inventoryValue = inv.reduce(
    (acc, r) => acc + r.on_hand_units * (costBySku.get(r.product_id) ?? 0),
    0,
  );

  const monthly = new Map<string, { units: number; revenue: number }>();
  for (const row of hist) {
    const key = row.period_month.slice(0, 7);
    const cur = monthly.get(key) ?? { units: 0, revenue: 0 };
    cur.units += row.units;
    cur.revenue += Number(row.revenue_usd);
    monthly.set(key, cur);
  }
  const months = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b));
  const last12 = months.slice(-12);
  const last12Keys = new Set(last12.map(([k]) => k));
  const annualRevenue = last12.reduce((a, [, v]) => a + v.revenue, 0);
  const annualCogs = hist
    .filter((row) => last12Keys.has(row.period_month.slice(0, 7)))
    .reduce((acc, row) => acc + row.units * (costBySku.get(row.product_id) ?? 0), 0);

  const accuracyPairs = fcs
    .filter((f) => f.actual_units != null)
    .map((f) => ({ forecast: f.forecast_units, actual: f.actual_units as number }));

  const stockRisk = inv.filter(
    (r) =>
      stockStatus({
        onHand: r.on_hand_units,
        safetyStock: r.safety_stock_units,
        reorderPoint: r.reorder_point_units,
        avgDailyDemand: Number(r.avg_daily_demand),
      }) !== "HEALTHY",
  ).length;

  const openAlerts = alertRows.filter((a) => a.status === "OPEN");

  return {
    hasData: prods.length > 0 || sups.length > 0 || inv.length > 0 || ships.length > 0,
    kpis: {
      inventoryValueUsd: round(inventoryValue),
      inventoryTurns: inventoryTurns(annualCogs, inventoryValue),
      forecastAccuracyPct: accuracyPairs.length ? forecastAccuracy(accuracyPairs) : null,
      forecastBiasPct: accuracyPairs.length ? bias(accuracyPairs) : null,
      otifPct: otifRate(
        ships.map((s) => ({ promised: s.eta_date, arrived: s.actual_arrival_date })),
      ),
      avgDelayDays: avgDelayDays(
        ships.map((s) => ({ promised: s.eta_date, arrived: s.actual_arrival_date })),
      ),
      openPoValueUsd: round(
        poRows.filter((p) => p.status !== "RECEIVED").reduce((a, p) => a + Number(p.total_value_usd), 0),
      ),
      annualRevenueUsd: round(annualRevenue),
      skusAtRisk: stockRisk,
      skuCount: prods.length,
      positionCount: inv.length,
      supplierCount: sups.length,
      suppliersAtRisk: sups.filter(
        (s) => supplierStatus(supplierRiskScore(mapSupplier(s)), Number(s.on_time_delivery_rate)) !== "ACTIVE",
      ).length,
      inTransitShipments: ships.filter((s) => s.status === "IN_TRANSIT").length,
      delayedShipments: ships.filter((s) => s.status === "DELAYED").length,
      openAlerts: openAlerts.length,
      criticalAlerts: openAlerts.filter((a) => a.severity === "CRITICAL").length,
      alertImpactUsd: round(openAlerts.reduce((a, x) => a + Number(x.impact_usd ?? 0), 0)),
      freightSpendUsd: round(ships.reduce((a, s) => a + Number(s.freight_cost_usd), 0)),
      siteCount: siteRows.length,
      factoryCount: siteRows.filter((s) => {
        const t = s.site_type.toUpperCase();
        return t.includes("FACTORY") || t.includes("PLANT") || t.includes("MANUFACT");
      }).length,
    },
    topIncidents: openAlerts
      .slice()
      .sort((a, b) => {
        const rank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
      })
      .slice(0, 2)
      .map((a) => ({
        severity: a.severity,
        module: a.module,
        title: a.title,
        detail: a.detail,
        impactUsd: a.impact_usd == null ? null : Number(a.impact_usd),
      })),
    demandTrend: months.slice(-18).map(([k, v]) => ({
      label: monthLabel(k),
      units: v.units,
      revenue: round(v.revenue),
    })),
    alertsByModule: ["INVENTORY", "SUPPLIER", "LOGISTICS", "FORECAST"].map((m) => ({
      module: m,
      count: openAlerts.filter((a) => a.module === m).length,
    })),
    topRiskSuppliers: sups
      .map((s) => ({
        id: s.id,
        name: s.name,
        risk: supplierRiskScore(mapSupplier(s)),
        band: supplierStatus(supplierRiskScore(mapSupplier(s)), Number(s.on_time_delivery_rate)),
        spendUsd: Number(s.annual_spend_usd),
      }))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 5),
  };
}

type SupplierRiskRow = {
  on_time_delivery_rate: number | string;
  defect_rate_ppm: number;
  financial_risk_score: number | string;
  geopolitical_risk_score: number | string;
  capacity_risk_score: number | string;
};

function mapSupplier(s: SupplierRiskRow) {
  return {
    onTimeDeliveryRate: Number(s.on_time_delivery_rate),
    defectRatePpm: s.defect_rate_ppm,
    financialRiskScore: Number(s.financial_risk_score),
    geopoliticalRiskScore: Number(s.geopolitical_risk_score),
    capacityRiskScore: Number(s.capacity_risk_score),
  };
}

// Sums units over the last N calendar months. Demand rows are one per
// product/site/month, so slicing the raw row list would be arbitrary.
function trailingUnitsByMonth(rows: Array<{ period_month: string; units: number }>, months: number) {
  const byMonth = new Map<string, number>();
  for (const r of rows) {
    const k = r.period_month.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) ?? 0) + r.units);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-months)
    .reduce((acc, [, v]) => acc + v, 0);
}

// ------------------------------------------------------- DEMAND & FORECAST
export async function getDemandIntelligence(db: Db, workspaceId: string, productId?: string) {
  const [history, forecasts, products, sites] = await Promise.all([
    db
      .from("demand_history")
      .select("product_id,site_id,period_month,units,revenue_usd")
      .eq("workspace_id", workspaceId),
    db
      .from("demand_forecasts")
      .select("product_id,site_id,period_month,forecast_units,lower_bound_units,upper_bound_units,actual_units,model")
      .eq("workspace_id", workspaceId),
    db.from("products").select("id,sku,name,category,unit_price,abc_class,lifecycle_stage").eq("workspace_id", workspaceId),
    db.from("sites").select("id,code,name,region,site_type").eq("workspace_id", workspaceId),
  ]);

  const hist = unwrap(history);
  const fcs = unwrap(forecasts);
  const prods = unwrap(products);
  const siteRows = unwrap(sites);

  const scopedHist = productId ? hist.filter((h) => h.product_id === productId) : hist;
  const scopedFcs = productId ? fcs.filter((f) => f.product_id === productId) : fcs;

  const byMonth = new Map<string, { actual: number; forecast: number; low: number; high: number }>();
  for (const h of scopedHist) {
    const k = h.period_month.slice(0, 7);
    const cur = byMonth.get(k) ?? { actual: 0, forecast: 0, low: 0, high: 0 };
    cur.actual += h.units;
    byMonth.set(k, cur);
  }
  for (const f of scopedFcs) {
    const k = f.period_month.slice(0, 7);
    const cur = byMonth.get(k) ?? { actual: 0, forecast: 0, low: 0, high: 0 };
    cur.forecast += f.forecast_units;
    cur.low += f.lower_bound_units;
    cur.high += f.upper_bound_units;
    byMonth.set(k, cur);
  }

  const series = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({
      period: k,
      label: monthLabel(k),
      actual: v.actual || null,
      forecast: v.forecast || null,
      low: v.low || null,
      high: v.high || null,
    }));

  const accuracyByProduct = prods
    .map((p) => {
      const pairs = fcs
        .filter((f) => f.product_id === p.id && f.actual_units != null)
        .map((f) => ({ forecast: f.forecast_units, actual: f.actual_units as number }));
      const future = fcs
        .filter((f) => f.product_id === p.id && f.actual_units == null)
        .reduce((a, f) => a + f.forecast_units, 0);
      const trailing = trailingUnitsByMonth(
        hist.filter((h) => h.product_id === p.id),
        6,
      );
      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        abcClass: p.abc_class,
        lifecycle: p.lifecycle_stage,
        accuracyPct: pairs.length ? forecastAccuracy(pairs) : null,
        mapePct: pairs.length ? mape(pairs) : null,
        biasPct: pairs.length ? bias(pairs) : null,
        next6mUnits: future,
        next6mRevenueUsd: round(future * Number(p.unit_price)),
        trailing6mUnits: trailing,
      };
    })
    .sort((a, b) => b.next6mRevenueUsd - a.next6mRevenueUsd);

  const regionMix = siteRows
    .filter((s) => s.site_type === "DISTRIBUTION_CENTER")
    .map((s) => ({
      site: s.code,
      region: s.region,
      next6mUnits: scopedFcs
        .filter((f) => f.site_id === s.id && f.actual_units == null)
        .reduce((a, f) => a + f.forecast_units, 0),
    }));

  const allPairs = scopedFcs
    .filter((f) => f.actual_units != null)
    .map((f) => ({ forecast: f.forecast_units, actual: f.actual_units as number }));

  return {
    products: prods.map((p) => ({ id: p.id, sku: p.sku, name: p.name })),
    selectedProductId: productId ?? null,
    series,
    summary: {
      accuracyPct: allPairs.length ? forecastAccuracy(allPairs) : null,
      mapePct: allPairs.length ? mape(allPairs) : null,
      biasPct: allPairs.length ? bias(allPairs) : null,
      next6mUnits: scopedFcs.filter((f) => f.actual_units == null).reduce((a, f) => a + f.forecast_units, 0),
      trailing12mUnits: trailingUnitsByMonth(scopedHist, 12),
    },
    accuracyByProduct,
    regionMix,
  };
}

// ----------------------------------------------------- FORECAST GENERATION
const FORECAST_MODEL = "SIMPLE_MOVING_AVERAGE";
const MIN_FORECAST_HISTORY = 3;
const FORECAST_HORIZON_MONTHS = 6;

function monthWithOffset(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 10);
}

function movingAverage(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function forecastBounds(values: number[], mean: number) {
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const eightyPercentRadius = 1.28 * Math.sqrt(variance);
  return {
    lower_bound_units: Math.max(0, Math.floor(mean - eightyPercentRadius)),
    upper_bound_units: Math.max(0, Math.ceil(mean + eightyPercentRadius)),
  };
}

export async function generateDemandForecasts(
  db: Db,
  workspaceId: string,
  productId?: string,
) {
  let historyQuery = db
    .from("demand_history")
    .select("product_id,site_id,period_month,units")
    .eq("workspace_id", workspaceId);
  let productsQuery = db
    .from("products")
    .select("id")
    .eq("workspace_id", workspaceId);
  let sitesQuery = db
    .from("sites")
    .select("id")
    .eq("workspace_id", workspaceId);

  if (productId) {
    historyQuery = historyQuery.eq("product_id", productId);
    productsQuery = productsQuery.eq("id", productId);
  }

  const [historyResult, productsResult, sitesResult] = await Promise.all([
    historyQuery,
    productsQuery,
    sitesQuery,
  ]);
  const history = unwrap(historyResult);
  const products = unwrap(productsResult);
  const sites = unwrap(sitesResult);
  const productIds = new Set(products.map((product) => product.id));
  const siteIds = new Set(sites.map((site) => site.id));

  const groupedHistory = new Map<
    string,
    { productId: string; siteId: string; rows: typeof history }
  >();
  for (const row of history) {
    if (!productIds.has(row.product_id) || !siteIds.has(row.site_id)) continue;
    const key = `${row.product_id}:${row.site_id}`;
    const group = groupedHistory.get(key) ?? {
      productId: row.product_id,
      siteId: row.site_id,
      rows: [],
    };
    group.rows.push(row);
    groupedHistory.set(key, group);
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const forecastRows: Database["public"]["Tables"]["demand_forecasts"]["Insert"][] = [];
  let eligibleSeries = 0;
  let insufficientSeries = 0;
  let historicalBacktests = 0;
  let futureForecasts = 0;

  for (const group of groupedHistory.values()) {
    const rows = [...group.rows].sort((a, b) =>
      a.period_month.localeCompare(b.period_month),
    );
    if (rows.length < MIN_FORECAST_HISTORY) {
      insufficientSeries += 1;
      continue;
    }
    eligibleSeries += 1;

    for (let index = MIN_FORECAST_HISTORY; index < rows.length; index += 1) {
      const trainingRows = rows.slice(Math.max(0, index - 6), index);
      const values = trainingRows.map((row) => row.units);
      const mean = movingAverage(values);
      forecastRows.push({
        workspace_id: workspaceId,
        product_id: group.productId,
        site_id: group.siteId,
        period_month: rows[index].period_month,
        model: FORECAST_MODEL,
        forecast_units: Math.max(0, Math.round(mean)),
        ...forecastBounds(values, mean),
        actual_units: rows[index].units,
      });
      historicalBacktests += 1;
    }

    const trainingRows = rows.slice(-6);
    const values = trainingRows.map((row) => row.units);
    const mean = movingAverage(values);
    const forecastUnits = Math.max(0, Math.round(mean));
    const bounds = forecastBounds(values, mean);
    const latestHistoryMonth = rows[rows.length - 1].period_month.slice(0, 7);
    const forecastStartMonth =
      latestHistoryMonth > currentMonth ? latestHistoryMonth : currentMonth;

    for (let month = 1; month <= FORECAST_HORIZON_MONTHS; month += 1) {
      forecastRows.push({
        workspace_id: workspaceId,
        product_id: group.productId,
        site_id: group.siteId,
        period_month: monthWithOffset(forecastStartMonth, month),
        model: FORECAST_MODEL,
        forecast_units: forecastUnits,
        ...bounds,
        actual_units: null,
      });
      futureForecasts += 1;
    }
  }

  if (forecastRows.length > 0) {
    const { error } = await db
      .from("demand_forecasts")
      .upsert(forecastRows, {
        onConflict: "product_id,site_id,period_month,model",
      });
    if (error) throw new Error(`Demand forecast generation failed: ${error.message}`);
  }

  return {
    eligibleSeries,
    insufficientSeries,
    historicalBacktests,
    futureForecasts,
    savedRows: forecastRows.length,
    minimumHistoryMonths: MIN_FORECAST_HISTORY,
  };
}

// -------------------------------------------------------------- INVENTORY
export async function getInventoryHealth(db: Db, workspaceId: string) {
  const [positions, products, sites, sourcingRows] = await Promise.all([
    db
      .from("inventory_positions")
      .select(
        "id,product_id,site_id,on_hand_units,on_order_units,allocated_units,safety_stock_units,reorder_point_units,avg_daily_demand",
      )
      .eq("workspace_id", workspaceId),
    db.from("products").select("id,sku,name,category,unit_cost,unit_price,abc_class").eq("workspace_id", workspaceId),
    db.from("sites").select("id,code,name,region").eq("workspace_id", workspaceId),
    db.from("product_suppliers").select("product_id,moq,is_primary").eq("workspace_id", workspaceId),
  ]);

  const pos = unwrap(positions);
  const prods = unwrap(products);
  const siteRows = unwrap(sites);
  const primarySourcingByProduct = new Map(
    unwrap(sourcingRows).filter((row) => row.is_primary).map((row) => [row.product_id, row]),
  );
  const productById = new Map(prods.map((p) => [p.id, p]));
  const siteById = new Map(siteRows.map((s) => [s.id, s]));

  const rows = pos.map((r) => {
    const p = productById.get(r.product_id);
    const s = siteById.get(r.site_id);
    const add = Number(r.avg_daily_demand);
    const status = stockStatus({
      onHand: r.on_hand_units,
      safetyStock: r.safety_stock_units,
      reorderPoint: r.reorder_point_units,
      avgDailyDemand: add,
    });
    const unitCost = Number(p?.unit_cost ?? 0);
    const unitPrice = Number(p?.unit_price ?? 0);
    const primarySourcing = primarySourcingByProduct.get(r.product_id);
    const shortfallUnits = Math.max(0, r.reorder_point_units - r.on_hand_units - r.on_order_units);
    return {
      id: r.id,
      productId: r.product_id,
      sku: p?.sku ?? "-",
      productName: p?.name ?? "-",
      category: p?.category ?? "-",
      abcClass: p?.abc_class ?? "-",
      siteCode: s?.code ?? "-",
      siteName: s?.name ?? "-",
      region: s?.region ?? "-",
      onHand: r.on_hand_units,
      onOrder: r.on_order_units,
      allocated: r.allocated_units,
      safetyStock: r.safety_stock_units,
      reorderPoint: r.reorder_point_units,
      avgDailyDemand: add,
      coverDays: coverDays(r.on_hand_units, add),
      status,
      valueUsd: round(r.on_hand_units * unitCost),
      suggestedOrderUnits: shortfallUnits > 0 ? Math.max(shortfallUnits, primarySourcing?.moq ?? 0) : 0,
      shortfallValueUsd: round(Math.max(0, r.reorder_point_units - r.on_hand_units) * unitPrice * 0.35),
    };
  });

  const byStatus = (s: StockStatus) => rows.filter((r) => r.status === s);

  return {
    rows: rows.sort((a, b) => a.coverDays - b.coverDays),
    summary: {
      totalValueUsd: round(rows.reduce((a, r) => a + r.valueUsd, 0)),
      stockoutRisk: byStatus("STOCKOUT_RISK").length,
      belowReorder: byStatus("BELOW_REORDER").length,
      healthy: byStatus("HEALTHY").length,
      excess: byStatus("EXCESS").length,
      excessValueUsd: round(byStatus("EXCESS").reduce((a, r) => a + r.valueUsd, 0)),
      exposureUsd: round(rows.reduce((a, r) => a + r.shortfallValueUsd, 0)),
      avgCoverDays: round(rows.reduce((a, r) => a + r.coverDays, 0) / (rows.length || 1), 1),
    },
    byRegion: [...new Set(rows.map((r) => r.region))].map((region) => ({
      region,
      valueUsd: round(rows.filter((r) => r.region === region).reduce((a, r) => a + r.valueUsd, 0)),
      atRisk: rows.filter((r) => r.region === region && r.status !== "HEALTHY").length,
    })),
  };
}

// --------------------------------------------------------------- SUPPLIERS
export async function getSupplierIntelligence(db: Db, workspaceId: string) {
  const [suppliers, pos, links] = await Promise.all([
    db.from("suppliers").select("*").eq("workspace_id", workspaceId),
    db
      .from("purchase_orders")
      .select("supplier_id,status,promised_date,received_date,total_value_usd")
      .eq("workspace_id", workspaceId),
    db.from("product_suppliers").select("supplier_id,product_id,is_primary").eq("workspace_id", workspaceId),
  ]);

  const sups = unwrap(suppliers);
  const poRows = unwrap(pos);
  const linkRows = unwrap(links);

  const rows = sups
    .map((s) => {
      const supplierPos = poRows.filter((p) => p.supplier_id === s.id);
      const risk = supplierRiskScore(mapSupplier(s));
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        category: s.category,
        tier: s.tier,
        country: s.country,
        region: s.region,
        status: supplierStatus(risk, Number(s.on_time_delivery_rate)),
        leadTimeDays: s.lead_time_days,
        onTimeDeliveryRate: Number(s.on_time_delivery_rate),
        defectRatePpm: s.defect_rate_ppm,
        financialRisk: Number(s.financial_risk_score),
        geopoliticalRisk: Number(s.geopolitical_risk_score),
        capacityRisk: Number(s.capacity_risk_score),
        riskScore: risk,
        riskBand: supplierStatus(risk, Number(s.on_time_delivery_rate)),
        annualSpendUsd: Number(s.annual_spend_usd),
        contractExpiry: s.contract_expiry,
        openPoCount: supplierPos.filter((p) => p.status !== "RECEIVED").length,
        openPoValueUsd: round(
          supplierPos.filter((p) => p.status !== "RECEIVED").reduce((a, p) => a + Number(p.total_value_usd), 0),
        ),
        measuredOtifPct: otifRate(
          supplierPos.map((p) => ({ promised: p.promised_date, arrived: p.received_date })),
        ),
        skusSourced: linkRows.filter((l) => l.supplier_id === s.id).length,
        soleSourcedSkus: linkRows.filter((l) => l.supplier_id === s.id && l.is_primary).filter((l) => {
          return linkRows.filter((o) => o.product_id === l.product_id).length === 1;
        }).length,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  const totalSpend = rows.reduce((a, r) => a + r.annualSpendUsd, 0);

  return {
    rows,
    summary: {
      supplierCount: rows.length,
      totalSpendUsd: round(totalSpend),
      avgOtifPct: round(rows.reduce((a, r) => a + r.onTimeDeliveryRate, 0) / (rows.length || 1), 1),
      avgDefectPpm: round(rows.reduce((a, r) => a + r.defectRatePpm, 0) / (rows.length || 1)),
      highRiskCount: rows.filter((r) => r.riskScore >= 40 || r.onTimeDeliveryRate < 92).length,
      spendAtRiskUsd: round(rows.filter((r) => r.riskScore >= 40 || r.onTimeDeliveryRate < 92).reduce((a, r) => a + r.annualSpendUsd, 0)),
      contractsExpiring12m: rows.filter(
        (r) =>
          r.contractExpiry &&
          new Date(r.contractExpiry).getTime() < Date.now() + 365 * 86400000,
      ).length,
    },
    spendByRegion: [...new Set(rows.map((r) => r.region))].map((region) => ({
      region,
      spendUsd: round(rows.filter((r) => r.region === region).reduce((a, r) => a + r.annualSpendUsd, 0)),
      sharePct: round(
        (rows.filter((r) => r.region === region).reduce((a, r) => a + r.annualSpendUsd, 0) /
          (totalSpend || 1)) *
        100,
        1,
      ),
    })),
  };
}

// --------------------------------------------------------------- LOGISTICS
export async function getLogisticsPerformance(db: Db, workspaceId: string) {
  const [shipments, sites, suppliers, pos] = await Promise.all([
    db.from("shipments").select("*").eq("workspace_id", workspaceId),
    db.from("sites").select("id,code,name,region").eq("workspace_id", workspaceId),
    db.from("suppliers").select("id,name").eq("workspace_id", workspaceId),
    db.from("purchase_orders").select("id,po_number,supplier_id").eq("workspace_id", workspaceId),
  ]);

  const ships = unwrap(shipments);
  const siteById = new Map(unwrap(sites).map((s) => [s.id, s]));
  const supplierById = new Map(unwrap(suppliers).map((s) => [s.id, s]));
  const poById = new Map(unwrap(pos).map((p) => [p.id, p]));

  const rows = ships
    .map((s) => {
      const po = s.purchase_order_id ? poById.get(s.purchase_order_id) : undefined;
      const delay = s.actual_arrival_date
        ? round((new Date(s.actual_arrival_date).getTime() - new Date(s.eta_date).getTime()) / 86400000)
        : round((Date.now() - new Date(s.eta_date).getTime()) / 86400000);
      return {
        id: s.id,
        ref: s.shipment_ref,
        poNumber: po?.po_number ?? "-",
        supplierName: po ? (supplierById.get(po.supplier_id)?.name ?? "-") : "-",
        carrier: s.carrier,
        mode: s.mode,
        origin: s.origin_location,
        destination: siteById.get(s.destination_site_id)?.code ?? "-",
        lane: s.lane,
        status: s.status,
        shipDate: s.ship_date,
        etaDate: s.eta_date,
        arrivalDate: s.actual_arrival_date,
        units: s.units,
        freightCostUsd: Number(s.freight_cost_usd),
        costPerUnitUsd: round(Number(s.freight_cost_usd) / Math.max(s.units, 1), 2),
        delayDays: s.status === "DELIVERED" || s.actual_arrival_date ? delay : Math.max(0, delay),
      };
    })
    .sort((a, b) => b.delayDays - a.delayDays);

  const lanes = [...new Set(rows.map((r) => r.lane))].map((lane) => {
    const laneRows = rows.filter((r) => r.lane === lane);
    return {
      lane,
      shipments: laneRows.length,
      unitsShipped: laneRows.reduce((a, r) => a + r.units, 0),
      freightSpendUsd: round(laneRows.reduce((a, r) => a + r.freightCostUsd, 0)),
      avgCostPerUnitUsd: round(
        laneRows.reduce((a, r) => a + r.freightCostUsd, 0) /
        Math.max(
          laneRows.reduce((a, r) => a + r.units, 0),
          1,
        ),
        2,
      ),
      otifPct: otifRate(laneRows.map((r) => ({ promised: r.etaDate, arrived: r.arrivalDate }))),
      delayedCount: laneRows.filter((r) => r.status === "DELAYED").length,
    };
  });

  const modes = [...new Set(rows.map((r) => r.mode))].map((mode) => ({
    mode,
    shipments: rows.filter((r) => r.mode === mode).length,
    freightSpendUsd: round(rows.filter((r) => r.mode === mode).reduce((a, r) => a + r.freightCostUsd, 0)),
  }));

  return {
    rows,
    lanes: lanes.sort((a, b) => b.freightSpendUsd - a.freightSpendUsd),
    modes,
    summary: {
      totalShipments: rows.length,
      inTransit: rows.filter((r) => r.status === "IN_TRANSIT").length,
      delayed: rows.filter((r) => r.status === "DELAYED").length,
      delivered: rows.filter((r) => r.status === "DELIVERED").length,
      otifPct: otifRate(rows.map((r) => ({ promised: r.etaDate, arrived: r.arrivalDate }))),
      avgDelayDays: avgDelayDays(rows.map((r) => ({ promised: r.etaDate, arrived: r.arrivalDate }))),
      freightSpendUsd: round(rows.reduce((a, r) => a + r.freightCostUsd, 0)),
      avgCostPerUnitUsd: round(
        rows.reduce((a, r) => a + r.freightCostUsd, 0) / Math.max(rows.reduce((a, r) => a + r.units, 0), 1),
        2,
      ),
      unitsInTransit: rows.filter((r) => r.status === "IN_TRANSIT").reduce((a, r) => a + r.units, 0),
    },
  };
}

// ------------------------------------------------------------------ ALERTS
export async function getAlerts(db: Db, workspaceId: string, status?: string) {
  let query = db
    .from("alerts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const rows = unwrap(await query);
  const severityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return rows
    .map((a) => ({
      id: a.id,
      module: a.module,
      severity: a.severity,
      title: a.title,
      detail: a.detail,
      status: a.status,
      impactUsd: a.impact_usd == null ? null : Number(a.impact_usd),
      createdAt: a.created_at,
      acknowledgedAt: a.acknowledged_at,
    }))
    .sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9));
}

export async function setAlertStatus(
  db: Db,
  input: { alertId: string; status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED"; userId: string },
) {
  const patch =
    input.status === "OPEN"
      ? { status: "OPEN", acknowledged_by: null, acknowledged_at: null }
      : { status: input.status, acknowledged_by: input.userId, acknowledged_at: new Date().toISOString() };
  const res = await db.from("alerts").update(patch).eq("id", input.alertId).select("id").maybeSingle();
  if (res.error) throw new Error(res.error.message);
  if (!res.data) throw new Error("Alert not found or not permitted");
  return { id: res.data.id, status: input.status };
}

// -------------------------------------------------------- REPLENISHMENT PO
export async function createReplenishmentOrder(
  db: Db,
  input: { workspaceId: string; inventoryPositionId: string; quantityUnits: number; userId: string },
) {
  const position = await db
    .from("inventory_positions")
    .select("id,product_id,site_id,workspace_id,on_order_units")
    .eq("id", input.inventoryPositionId)
    .eq("workspace_id", input.workspaceId)
    .maybeSingle();
  if (position.error) throw new Error(position.error.message);
  if (!position.data) throw new Error("Stock position not found");

  const sourcing = await db
    .from("product_suppliers")
    .select("supplier_id,unit_cost,lead_time_days,moq")
    .eq("workspace_id", input.workspaceId)
    .eq("product_id", position.data.product_id)
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();
  if (sourcing.error) throw new Error(sourcing.error.message);
  if (!sourcing.data) throw new Error("No primary supplier configured for this product");

  const countRes = await db
    .from("purchase_orders")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", input.workspaceId);
  if (countRes.error) throw new Error(countRes.error.message);

  const poNumber = `PO-${new Date().getFullYear()}-${String((countRes.count ?? 0) + 1).padStart(4, "0")}`;
  const orderQuantity = Math.max(input.quantityUnits, sourcing.data.moq);
  const orderDate = new Date();
  const promised = new Date(orderDate.getTime() + sourcing.data.lead_time_days * 86400000);
  const totalValue = round(orderQuantity * Number(sourcing.data.unit_cost), 2);

  const po = await db
    .from("purchase_orders")
    .insert({
      workspace_id: input.workspaceId,
      po_number: poNumber,
      supplier_id: sourcing.data.supplier_id,
      site_id: position.data.site_id,
      status: "OPEN",
      order_date: orderDate.toISOString().slice(0, 10),
      promised_date: promised.toISOString().slice(0, 10),
      total_value_usd: totalValue,
      created_by: input.userId,
    })
    .select("id,po_number,promised_date,total_value_usd")
    .single();
  if (po.error) throw new Error(po.error.message);

  const line = await db.from("purchase_order_lines").insert({
    workspace_id: input.workspaceId,
    purchase_order_id: po.data.id,
    product_id: position.data.product_id,
    quantity_units: orderQuantity,
    unit_cost: Number(sourcing.data.unit_cost),
  });
  if (line.error) throw new Error(line.error.message);

  const bump = await db
    .from("inventory_positions")
    .update({
      on_order_units: position.data.on_order_units + orderQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", position.data.id)
    .eq("workspace_id", input.workspaceId);
  if (bump.error) throw new Error(bump.error.message);

  return {
    poNumber: po.data.po_number,
    promisedDate: po.data.promised_date,
    totalValueUsd: Number(po.data.total_value_usd),
    quantityUnits: orderQuantity,
  };
}

export async function getPurchaseOrders(db: Db, workspaceId: string) {
  const [pos, suppliers, sites] = await Promise.all([
    db
      .from("purchase_orders")
      .select("id,po_number,supplier_id,site_id,status,order_date,promised_date,received_date,total_value_usd")
      .eq("workspace_id", workspaceId)
      .order("order_date", { ascending: false }),
    db.from("suppliers").select("id,name").eq("workspace_id", workspaceId),
    db.from("sites").select("id,code").eq("workspace_id", workspaceId),
  ]);
  const supplierById = new Map(unwrap(suppliers).map((s) => [s.id, s.name]));
  const siteById = new Map(unwrap(sites).map((s) => [s.id, s.code]));
  return unwrap(pos).map((p) => ({
    id: p.id,
    poNumber: p.po_number,
    supplierName: supplierById.get(p.supplier_id) ?? "-",
    siteCode: siteById.get(p.site_id) ?? "-",
    status: p.status,
    orderDate: p.order_date,
    promisedDate: p.promised_date,
    receivedDate: p.received_date,
    totalValueUsd: Number(p.total_value_usd),
  }));
}

// ------------------------------------------------ PROCUREMENT INTELLIGENCE
export async function getProcurementIntelligence(db: Db, workspaceId: string) {
  const [pos, suppliers, productSuppliers, products, demand] = await Promise.all([
    db.from("purchase_orders").select("id,po_number,supplier_id,status,total_value_usd").eq("workspace_id", workspaceId),
    db.from("suppliers").select("id,name,category,annual_spend_usd,defect_rate_ppm,on_time_delivery_rate").eq("workspace_id", workspaceId),
    db.from("product_suppliers").select("product_id,supplier_id,is_primary,unit_cost,moq").eq("workspace_id", workspaceId),
    db.from("products").select("id,sku,name,unit_cost,unit_price").eq("workspace_id", workspaceId),
    db.from("demand_history").select("product_id,units").eq("workspace_id", workspaceId),
  ]);

  const poRows = unwrap(pos);
  const supRows = unwrap(suppliers);
  const psRows = unwrap(productSuppliers);
  const prodRows = unwrap(products);
  const histRows = unwrap(demand);

  const prodById = new Map(prodRows.map((p) => [p.id, p]));
  const supById = new Map(supRows.map((s) => [s.id, s]));
  const unitsByProduct = new Map<string, number>();
  for (const h of histRows) {
    unitsByProduct.set(h.product_id, (unitsByProduct.get(h.product_id) ?? 0) + h.units);
  }

  const opportunities: Array<{
    id: string;
    category: string;
    supplier: string;
    sku: string;
    potentialSavings: number;
    impact: "HIGH" | "MEDIUM" | "LOW";
    action: string;
  }> = [];

  // 1. Secondary Sourcing Savings Opportunities
  const prodGroups = new Map<string, typeof psRows>();
  for (const ps of psRows) {
    const list = prodGroups.get(ps.product_id) ?? [];
    list.push(ps);
    prodGroups.set(ps.product_id, list);
  }

  let oppIdx = 1;
  for (const [prodId, sources] of prodGroups.entries()) {
    if (sources.length > 1) {
      const primary = sources.find((s) => s.is_primary);
      const secondary = sources.find((s) => !s.is_primary);
      if (primary && secondary) {
        const prod = prodById.get(prodId);
        const pSup = supById.get(primary.supplier_id);
        const sSup = supById.get(secondary.supplier_id);
        const costDiff = Number(primary.unit_cost) - Number(secondary.unit_cost);
        const volume = unitsByProduct.get(prodId) ?? 0;
        if (costDiff > 0 && prod && sSup && volume > 0) {
          const savings = round(costDiff * volume);
          opportunities.push({
            id: `sav-${oppIdx++}`,
            category: "Secondary Sourcing",
            supplier: sSup.name,
            sku: prod.sku,
            potentialSavings: savings,
            impact: savings > 500000 ? "HIGH" : "MEDIUM",
            action: `Shift allocation to ${sSup.name} to capture ${round(costDiff, 2)} unit cost differential across ${volume} historical units.`,
          });
        }
      }
    }
  }

  // 2. Quality Defect Recovery & Volume Rebate
  for (const s of supRows) {
    if (s.defect_rate_ppm > 500) {
      const spend = Number(s.annual_spend_usd);
      const savings = round(spend * (s.defect_rate_ppm / 1000000));
      if (savings > 50000) {
        opportunities.push({
          id: `sav-${oppIdx++}`,
          category: "Quality Defect Recovery",
          supplier: s.name,
          sku: s.category,
          potentialSavings: savings,
          impact: "HIGH",
          action: `Enforce contract penalty clauses for ${s.defect_rate_ppm} PPM defect rate breach.`,
        });
      }
    }
  }

  const totalIdentifiedSavings = opportunities.reduce((a, b) => a + b.potentialSavings, 0);

  return {
    opportunities,
    totalIdentifiedSavings,
  };
}

// ---------------------------------------------------- AI DECISION ROOM ENGINE
export async function getAiDecisionIntelligence(db: Db, workspaceId: string) {
  const [invRes, shipRes, supRes, alertRes] = await Promise.all([
    db.from("inventory_positions").select("id,on_hand_units,safety_stock_units,reorder_point_units,avg_daily_demand,product_id,site_id").eq("workspace_id", workspaceId),
    db.from("shipments").select("id,shipment_ref,status,eta_date,units,freight_cost_usd,lane").eq("workspace_id", workspaceId),
    db.from("suppliers").select("id,name,status,on_time_delivery_rate,defect_rate_ppm,financial_risk_score,geopolitical_risk_score,capacity_risk_score,annual_spend_usd").eq("workspace_id", workspaceId),
    db.from("alerts").select("id,title,severity,status,impact_usd,module").eq("workspace_id", workspaceId),
  ]);

  const [prodsRes, sitesRes] = await Promise.all([
    db.from("products").select("id,sku,name,unit_price").eq("workspace_id", workspaceId),
    db.from("sites").select("id,code,name").eq("workspace_id", workspaceId),
  ]);

  const inv = unwrap(invRes);
  const ships = unwrap(shipRes);
  const sups = unwrap(supRes);
  const alerts = unwrap(alertRes);
  const prods = unwrap(prodsRes);
  const sites = unwrap(sitesRes);

  const prodById = new Map(prods.map((p) => [p.id, p]));
  const siteById = new Map(sites.map((s) => [s.id, s]));

  // Rank inventory exposure using the documented sales-price risk factor.
  const riskPositions = inv
    .map((r) => {
      const p = prodById.get(r.product_id);
      const s = siteById.get(r.site_id);
      const shortfall = Math.max(0, r.reorder_point_units - r.on_hand_units);
      const impactUsd = shortfall * Number(p?.unit_price ?? 0) * 0.35;
      return {
        id: r.id,
        sku: p?.sku ?? "-",
        productName: p?.name ?? "-",
        siteCode: s?.code ?? "-",
        onHand: r.on_hand_units,
        safetyStock: r.safety_stock_units,
        shortfall,
        impactUsd,
      };
    })
    .sort((a, b) => b.impactUsd - a.impactUsd);

  if (inv.length === 0 && ships.length === 0 && sups.length === 0) {
    return {
      hasData: false,
      topRisk: null,
      topDelayedShip: null,
      topRiskSup: null,
      totalValueAtRisk: 0,
      groundedRecords: [],
      narrative: "",
      rootCauseDriver: "",
      rootCauseDetail: "",
      countermeasures: [] as string[],
    };
  }

  const topRisk = riskPositions.find((r) => r.shortfall > 0) ?? null;
  const topDelayedShip = ships.find((s) => s.status === "DELAYED") ?? null;
  const topRiskSup = sups.find(
    (s) => supplierStatus(supplierRiskScore(mapSupplier(s)), Number(s.on_time_delivery_rate)) !== "ACTIVE",
  ) ?? null;

  const totalValueAtRisk = alerts
    .filter((a) => a.status === "OPEN")
    .reduce((sum, a) => sum + Number(a.impact_usd ?? 0), 0);

  const groundedRecords: Array<{
    entityType: string;
    identifier: string;
    status: string;
    table: string;
    impact: string;
  }> = [];

  if (topRisk) {
    groundedRecords.push({
      entityType: "Inventory Position",
      identifier: `${topRisk.sku} @ ${topRisk.siteCode}`,
      status: "STOCKOUT_RISK",
      table: "inventory_positions",
      impact: `$${round(topRisk.impactUsd, 2)} estimated stockout exposure`,
    });
  }

  if (topDelayedShip) {
    groundedRecords.push({
      entityType: "Inbound Shipment",
      identifier: topDelayedShip.shipment_ref,
      status: topDelayedShip.status,
      table: "shipments",
      impact: `Lane: ${topDelayedShip.lane}`,
    });
  }

  if (topRiskSup) {
    groundedRecords.push({
      entityType: "Primary Supplier",
      identifier: topRiskSup.name,
      status: topRiskSup.status,
      table: "suppliers",
      impact: `${topRiskSup.on_time_delivery_rate}% OTIF`,
    });
  }

  const narrativeParts: string[] = [];
  if (topRisk) {
    narrativeParts.push(
      `${topRisk.productName} (${topRisk.sku}) at ${topRisk.siteCode} has ${topRisk.onHand} units on hand against a safety stock of ${topRisk.safetyStock} units (${topRisk.shortfall} unit shortfall).`,
    );
  }
  if (topDelayedShip) {
    narrativeParts.push(
      `Inbound shipment ${topDelayedShip.shipment_ref} on lane ${topDelayedShip.lane} is ${topDelayedShip.status} with ${topDelayedShip.units} units.`,
    );
  }
  if (topRiskSup) {
    narrativeParts.push(
      `Supplier ${topRiskSup.name} is ${topRiskSup.status} at ${topRiskSup.on_time_delivery_rate}% on-time delivery.`,
    );
  }

  const rootCauseDriver = topDelayedShip
    ? `Shipment ${topDelayedShip.shipment_ref} ${topDelayedShip.status}`
    : topRiskSup
      ? `Supplier ${topRiskSup.name} ${topRiskSup.status}`
      : topRisk
        ? `Inventory shortfall on ${topRisk.sku}`
        : "No exception driver in current records";

  const rootCauseDetail = topRiskSup
    ? `${topRiskSup.name} on-time delivery rate is ${topRiskSup.on_time_delivery_rate}%.`
    : topDelayedShip
      ? `${topDelayedShip.shipment_ref} is ${topDelayedShip.status} on ${topDelayedShip.lane}.`
      : topRisk
        ? `${topRisk.sku} on-hand ${topRisk.onHand} vs reorder gap ${topRisk.shortfall} units.`
        : "No supplier, shipment, or inventory exception selected from queried rows.";

  const countermeasures: string[] = [];
  if (topRisk) {
    countermeasures.push(
      `Reallocate available stock to ${topRisk.siteCode} to cover the ${topRisk.shortfall} unit shortfall on ${topRisk.sku}.`,
    );
  }
  if (topRiskSup) {
    countermeasures.push(
      `Review alternate sourcing for volume currently allocated to ${topRiskSup.name}.`,
    );
  }
  if (topDelayedShip) {
    countermeasures.push(
      `Expedite or re-route shipment ${topDelayedShip.shipment_ref} (${topDelayedShip.units} units on ${topDelayedShip.lane}).`,
    );
  }

  return {
    hasData: true,
    topRisk,
    topDelayedShip,
    topRiskSup,
    totalValueAtRisk,
    groundedRecords,
    narrative: narrativeParts.join(" ") || "Queried operational tables contain records but no stockout, delay, or at-risk supplier exception is currently open.",
    rootCauseDriver,
    rootCauseDetail,
    countermeasures,
  };
}

// ---------------------------------------------------- RECOMMENDATIONS TRIAGE
export async function getRecommendations(db: Db, workspaceId: string) {
  const [invRes, shipRes, supRes, alertRes] = await Promise.all([
    db.from("inventory_positions").select("id,on_hand_units,safety_stock_units,reorder_point_units,product_id,site_id").eq("workspace_id", workspaceId),
    db.from("shipments").select("id,shipment_ref,status,lane,units,freight_cost_usd").eq("workspace_id", workspaceId),
    db.from("suppliers").select("id,name,on_time_delivery_rate,defect_rate_ppm,financial_risk_score,geopolitical_risk_score,capacity_risk_score,annual_spend_usd").eq("workspace_id", workspaceId),
    db.from("alerts").select("id,title,severity,module,impact_usd,detail").eq("workspace_id", workspaceId),
  ]);

  const [prodsRes, sitesRes] = await Promise.all([
    db.from("products").select("id,sku,name,unit_price").eq("workspace_id", workspaceId),
    db.from("sites").select("id,code").eq("workspace_id", workspaceId),
  ]);

  const inv = unwrap(invRes);
  const ships = unwrap(shipRes);
  const sups = unwrap(supRes);
  const alerts = unwrap(alertRes);
  const prods = unwrap(prodsRes);
  const sites = unwrap(sitesRes);

  const prodById = new Map(prods.map((p) => [p.id, p]));
  const siteById = new Map(sites.map((s) => [s.id, s]));

  const recommendations: Array<{
    id: string;
    title: string;
    category: string;
    priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    impactUsd: number;
    sku: string;
    detail: string;
  }> = [];

  let idx = 1;

  // 1. Low inventory cover / Stockout risk recommendations
  for (const r of inv) {
    if (r.on_hand_units < r.reorder_point_units) {
      const p = prodById.get(r.product_id);
      const s = siteById.get(r.site_id);
      if (p && s) {
        const impact = round((r.reorder_point_units - r.on_hand_units) * Number(p.unit_price) * 0.35);
        recommendations.push({
          id: `rec-${idx++}`,
          title: `Expedite Replenishment for ${p.name}`,
          category: "REPLENISHMENT",
          priority: r.on_hand_units < r.safety_stock_units ? "CRITICAL" : "HIGH",
          impactUsd: impact,
          sku: p.sku,
          detail: `On-hand stock at ${s.code} is ${r.on_hand_units} units (safety target: ${r.safety_stock_units} units). Issue emergency PO line.`,
        });
      }
    }
  }

  // 2. Delayed shipments freight optimization recommendations
  for (const sh of ships) {
    if (sh.status === "DELAYED") {
      const impact = round(Number(sh.freight_cost_usd) * 0.5);
      recommendations.push({
        id: `rec-${idx++}`,
        title: `Reroute Delayed Shipment ${sh.shipment_ref}`,
        category: "FREIGHT",
        priority: "HIGH",
        impactUsd: impact,
        sku: sh.lane,
        detail: `Shipment ${sh.shipment_ref} delayed on ${sh.lane} for ${sh.units} units. Activate expedited local road freight.`,
      });
    }
  }

  // 3. High supplier risk mitigation recommendations
  for (const sup of sups) {
    const status = supplierStatus(supplierRiskScore(mapSupplier(sup)), Number(sup.on_time_delivery_rate));
    if (status !== "ACTIVE") {
      const impact = round(Number(sup.annual_spend_usd) * 0.04);
      recommendations.push({
        id: `rec-${idx++}`,
        title: `Dual-Sourcing Allocation for ${sup.name}`,
        category: "RISK_MITIGATION",
        priority: "HIGH",
        impactUsd: impact,
        sku: sup.name,
        detail: `Supplier ${sup.name} is ${status} with OTIF ${sup.on_time_delivery_rate}%. Reallocate order volume using queried product_suppliers relationships.`,
      });
    }
  }

  return recommendations;
}
