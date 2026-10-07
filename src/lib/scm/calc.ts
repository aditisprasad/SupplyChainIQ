// Pure, reusable supply-chain calculations. Shared by server services.

export function mape(pairs: Array<{ forecast: number; actual: number }>): number {
  if (pairs.length === 0) return 0;
  const sum = pairs.reduce((acc, p) => acc + Math.abs(p.forecast - p.actual) / Math.max(p.actual, 1), 0);
  return round((sum / pairs.length) * 100, 1);
}

export function bias(pairs: Array<{ forecast: number; actual: number }>): number {
  if (pairs.length === 0) return 0;
  const totalBias = pairs.reduce((acc, p) => acc + (p.forecast - p.actual) / Math.max(p.actual, 1), 0);
  return round((totalBias / pairs.length) * 100, 1);
}

export function forecastAccuracy(pairs: Array<{ forecast: number; actual: number }>): number {
  return round(Math.max(0, 100 - mape(pairs)), 1);
}

export function coverDays(onHand: number, avgDailyDemand: number): number {
  return round(onHand / Math.max(avgDailyDemand, 0.1), 1);
}

export type StockStatus = "STOCKOUT_RISK" | "BELOW_REORDER" | "HEALTHY" | "EXCESS";

export function stockStatus(input: {
  onHand: number;
  safetyStock: number;
  reorderPoint: number;
  avgDailyDemand: number;
}): StockStatus {
  if (input.onHand === 0) return "STOCKOUT_RISK";
  if (input.onHand < input.safetyStock) return "STOCKOUT_RISK";
  if (input.onHand < input.reorderPoint) return "BELOW_REORDER";
  if (input.onHand > input.avgDailyDemand * 90) return "EXCESS";
  return "HEALTHY";
}

// Composite supplier risk follows the weighted score in BUSINESS_RULES.md.
export function supplierRiskScore(s: {
  onTimeDeliveryRate: number;
  defectRatePpm: number;
  financialRiskScore: number;
  geopoliticalRiskScore: number;
  capacityRiskScore: number;
}): number {
  const score =
    s.financialRiskScore * 0.35 +
    s.geopoliticalRiskScore * 0.35 +
    s.capacityRiskScore * 0.3;
  return round(clamp(score, 0, 100), 1);
}

export function supplierStatus(score: number, onTimeDeliveryRate: number): "ACTIVE" | "AT_RISK" | "CRITICAL_RISK" {
  if (score >= 60 || onTimeDeliveryRate < 85) return "CRITICAL_RISK";
  if (score >= 40 || onTimeDeliveryRate < 92) return "AT_RISK";
  return "ACTIVE";
}

// On-time in-full is only meaningful once shipments have actually arrived.
// Returns null when nothing has closed yet, so the UI can show "no data" rather
// than a misleading 0%.
export function otifRate(rows: Array<{ promised: string; arrived: string | null }>): number | null {
  const closed = rows.filter((r) => r.arrived);
  if (closed.length === 0) return null;
  const onTime = closed.filter((r) => new Date(r.arrived!) <= new Date(r.promised)).length;
  return round((onTime / closed.length) * 100, 1);
}


export function avgDelayDays(rows: Array<{ promised: string; arrived: string | null }>): number {
  const late = rows.filter((r) => r.arrived && new Date(r.arrived) > new Date(r.promised));
  if (late.length === 0) return 0;
  const total = late.reduce(
    (acc, r) => acc + (new Date(r.arrived!).getTime() - new Date(r.promised).getTime()) / 86400000,
    0,
  );
  return round(total / late.length, 1);
}

export function inventoryTurns(annualCogs: number, inventoryValue: number): number {
  if (inventoryValue <= 0) return 0;
  return round(annualCogs / inventoryValue, 2);
}

export function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function monthLabel(period: string): string {
  const d = new Date(`${period.slice(0, 7)}-01T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}
