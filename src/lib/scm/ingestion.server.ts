import type { SupabaseClient } from "@supabase/supabase-js";
import { assertCanWrite } from "./operations.server";
import { supplierRiskScore, supplierStatus } from "./calc";
import { normalizeDateToIso, normalizeExcelDateToMonth } from "./date-normalization";

export interface ImportRowError {
    row: number;
    stage: "validation" | "product_suppliers" | "purchase_orders" | "purchase_order_lines" | "shipments";
    code?: string;
    message: string;
    details?: string;
    hint?: string;
}

export interface ImportRecord {
    id: string;
    filename: string;
    dataset: string;
    rowCount: number;
    validCount: number;
    errorCount: number;
    qualityScore: number;
    status: "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED";
    importedAt: string;
    importedBy?: string;
}

export async function getImportHistory(client: SupabaseClient, workspaceId: string): Promise<ImportRecord[]> {
    const { data, error } = await client
        .from("data_imports")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(
            `Import history read failed in public.data_imports [${error.code ?? "unknown"}]: ${error.message}` +
            (error.details ? `; details: ${error.details}` : "") +
            (error.hint ? `; hint: ${error.hint}` : ""),
        );
    }

    return (data ?? []).map((d) => ({
        id: d.id,
        filename: d.filename,
        dataset: d.dataset,
        rowCount: d.row_count,
        validCount: d.valid_count,
        errorCount: d.error_count,
        qualityScore: d.quality_score,
        status: d.status,
        importedAt: d.created_at,
        importedBy: d.created_by ?? "System",
    }));
}

async function createImportRecord(
    client: SupabaseClient,
    workspaceId: string,
    filename: string,
    dataset: string,
    rowCount: number,
    userId?: string,
) {
    const { data, error } = await client
        .from("data_imports")
        .insert({
            workspace_id: workspaceId,
            filename,
            dataset,
            row_count: rowCount,
            valid_count: 0,
            error_count: 0,
            quality_score: 0,
            status: "PROCESSING",
            created_by: userId,
        })
        .select("id,filename,dataset,row_count,valid_count,error_count,quality_score,status,created_at,created_by")
        .single();

    if (error || !data) {
        throw new Error(
            `Import audit start failed in public.data_imports [${error?.code ?? "unknown"}]: ${error?.message ?? "No row returned"}` +
            (error?.details ? `; details: ${error.details}` : "") +
            (error?.hint ? `; hint: ${error.hint}` : ""),
        );
    }

    return mapImportRecord(data);
}

async function finishImportRecord(
    client: SupabaseClient,
    workspaceId: string,
    id: string,
    result: Pick<ImportRecord, "validCount" | "errorCount" | "qualityScore" | "status">,
) {
    const { data, error } = await client
        .from("data_imports")
        .update({
            valid_count: result.validCount,
            error_count: result.errorCount,
            quality_score: result.qualityScore,
            status: result.status,
        })
        .eq("id", id)
        .eq("workspace_id", workspaceId)
        .select("id,filename,dataset,row_count,valid_count,error_count,quality_score,status,created_at,created_by")
        .single();

    if (error || !data) {
        throw new Error(
            `Import audit finalization failed in public.data_imports [${error?.code ?? "unknown"}]: ${error?.message ?? "No row returned"}` +
            (error?.details ? `; details: ${error.details}` : "") +
            (error?.hint ? `; hint: ${error.hint}` : ""),
        );
    }

    return mapImportRecord(data);
}

async function flushImportEvents(client: SupabaseClient, workspaceId: string, importId: string) {
    try {
        const { retryPendingDomainEvents } = await import("../kafka/producer.server");
        await retryPendingDomainEvents(client, workspaceId);
    } catch (error) {
        console.error("[domain-events] Import events remain queued for retry", {
            workspaceId,
            importId,
            message: error instanceof Error ? error.message : String(error),
        });
    }
}

function mapImportRecord(data: {
    id: string;
    filename: string;
    dataset: string;
    row_count: number;
    valid_count: number;
    error_count: number;
    quality_score: number;
    status: string;
    created_at: string;
    created_by: string | null;
}): ImportRecord {
    return {
        id: data.id,
        filename: data.filename,
        dataset: data.dataset,
        rowCount: data.row_count,
        validCount: data.valid_count,
        errorCount: data.error_count,
        qualityScore: Number(data.quality_score),
        status: data.status as ImportRecord["status"],
        importedAt: data.created_at,
        importedBy: data.created_by ?? "System",
    };
}

function assertLookupSucceeded(label: string, error: { code?: string; message: string } | null) {
    if (error) {
        throw new Error(`${label} lookup failed${error.code ? ` [${error.code}]` : ""}: ${error.message}`);
    }
}

function getImportStatus(rowCount: number, validCount: number): ImportRecord["status"] {
    if (rowCount > 0 && validCount === rowCount) return "COMPLETED";
    if (validCount > 0) return "PARTIAL";
    return "FAILED";
}

function parseMonthPeriod(val: unknown): string {
    const str = String(normalizeExcelDateToMonth(val) ?? val ?? "").trim();
    if (!str) throw new Error("Demand history row is missing period_month");
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const parsed = new Date(`${str}T00:00:00Z`);
        if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === str) return str;
        throw new Error(`Invalid demand period_month: ${str}`);
    }
    if (/^\d{4}-\d{2}$/.test(str)) {
        const normalized = `${str}-01`;
        if (Number(str.slice(5, 7)) >= 1 && Number(str.slice(5, 7)) <= 12) return normalized;
        throw new Error(`Invalid demand period_month: ${str}`);
    }
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
        const d = new Date(parsed);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    }
    throw new Error(`Invalid demand period_month: ${str}`);
}

function normalizeHeaderName(value: string): string {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getRowValue(row: Record<string, unknown>, aliases: string[]): unknown {
    for (const alias of aliases) {
        const exact = row[alias];
        if (exact !== undefined && exact !== null && exact !== "") return exact;

        const matchKey = Object.keys(row).find((key) => normalizeHeaderName(key) === normalizeHeaderName(alias));
        if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null && row[matchKey] !== "") {
            return row[matchKey];
        }
    }
    return undefined;
}

export async function executeDatasetImport(
    client: SupabaseClient,
    params: {
        workspaceId: string;
        dataset: string;
        filename: string;
        rows: Record<string, unknown>[];
        userId: string;
    },
) {
    const { workspaceId, dataset, filename, rows, userId } = params;
    await assertCanWrite(client, userId);

    const auditRecord = await createImportRecord(client, workspaceId, filename, dataset, rows.length, userId);
    let validCount = 0;
    let errorCount = 0;
    const rowErrors: ImportRowError[] = [];

    function addRowError(row: number, stage: ImportRowError["stage"], error: unknown) {
        if (error && typeof error === "object") {
            const dbError = error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
            rowErrors.push({
                row,
                stage,
                code: typeof dbError.code === "string" ? dbError.code : undefined,
                message: typeof dbError.message === "string" ? dbError.message : String(error),
                details: typeof dbError.details === "string" ? dbError.details : undefined,
                hint: typeof dbError.hint === "string" ? dbError.hint : undefined,
            });
            return;
        }
        rowErrors.push({ row, stage, message: error instanceof Error ? error.message : String(error) });
    }

    try {
    if (dataset === "products") {
        for (const [rowIndex, row] of rows.entries()) {
            try {
                const sku = String(row["sku"] || row["SKU"] || row["code"] || "").trim();
                const name = String(row["name"] ?? row["Name"] ?? row["product_name"] ?? "").trim();
                const category = String(row["category"] ?? row["Category"] ?? "").trim();
                const unitCostValue = row["unit_cost"] ?? row["UnitCost"] ?? row["cost"];
                const unitPriceValue = row["unit_price"] ?? row["UnitPrice"] ?? row["price"];
                const unitCost = unitCostValue === undefined || unitCostValue === "" ? Number.NaN : Number(unitCostValue);
                const unitPrice = unitPriceValue === undefined || unitPriceValue === "" ? Number.NaN : Number(unitPriceValue);

                const abcClass = String(row["abc_class"] ?? row["ABC"] ?? "").trim().toUpperCase();
                const lifecycleStage = String(row["lifecycle_stage"] ?? "").trim().toUpperCase();
                if (!sku || !name || !category || !Number.isFinite(unitCost) || !Number.isFinite(unitPrice) || !abcClass || !lifecycleStage) {
                    errorCount++;
                    continue;
                }

                const product: Record<string, unknown> = {
                    workspace_id: workspaceId,
                    sku,
                    name,
                    category,
                    unit_cost: unitCost,
                    unit_price: unitPrice,
                };
                product.abc_class = abcClass;
                product.lifecycle_stage = lifecycleStage;

                const { error } = await client.from("products").upsert(
                    product as never,
                    { onConflict: "workspace_id,sku" },
                );

                if (error) {
                    errorCount++;
                } else validCount++;
            } catch {
                errorCount++;
            }
        }
    } else if (dataset === "suppliers") {
        for (const [rowIndex, row] of rows.entries()) {
            try {
                const code = String(getRowValue(row, ["supplier code", "supplier_code", "suppliercode", "code"]) ?? "").trim();
                const name = String(getRowValue(row, ["supplier name", "supplier_name", "suppliername", "name"]) ?? "").trim();
                const category = String(getRowValue(row, ["category"]) ?? "").trim();
                const country = String(getRowValue(row, ["country"]) ?? "").trim();
                const region = String(getRowValue(row, ["region"]) ?? "").trim();
                if (!code || !name || !category || !country || !region) { errorCount++; continue; }

                const supplier: Record<string, unknown> = { workspace_id: workspaceId, code, name, category, country, region };
                const numericFields = [
                    ["tier", getRowValue(row, ["tier"])],
                    ["lead_time_days", getRowValue(row, ["lead time (days)", "lead time", "lead_time_days", "leadtime"])],
                    ["on_time_delivery_rate", getRowValue(row, ["otif %", "otif percent", "on time delivery rate", "on_time_delivery_rate", "otif"])],
                    ["defect_rate_ppm", getRowValue(row, ["defect rate (ppm)", "defect ppm", "defect rate", "defect_rate_ppm", "defect ppm"])],
                    ["financial_risk_score", getRowValue(row, ["financial risk (0-100)", "financial risk", "financial_risk_score", "financial risk score"])],
                    ["geopolitical_risk_score", getRowValue(row, ["geopolitical risk (0-100)", "geopolitical risk", "geopolitical_risk_score", "geopolitical risk score"])],
                    ["capacity_risk_score", getRowValue(row, ["capacity risk (0-100)", "capacity risk", "capacity_risk_score", "capacity risk score"])],
                    ["annual_spend_usd", getRowValue(row, ["annual spend ($)", "annual spend", "annual_spend_usd", "spend", "annual spend usd"])],
                ] as const;
                const requiredNumericFields = new Set([
                    "tier",
                    "lead_time_days",
                    "on_time_delivery_rate",
                    "defect_rate_ppm",
                    "financial_risk_score",
                    "geopolitical_risk_score",
                    "capacity_risk_score",
                    "annual_spend_usd",
                ]);
                for (const [column, value] of numericFields) {
                    if (value === undefined || value === "") {
                        if (requiredNumericFields.has(column)) throw new Error(`Missing ${column}`);
                        continue;
                    }
                    const numericValue = Number(value);
                    if (!Number.isFinite(numericValue)) throw new Error(`Invalid ${column}`);
                    supplier[column] = numericValue;
                }
                supplier.status = supplierStatus(
                    supplierRiskScore({
                        onTimeDeliveryRate: Number(supplier.on_time_delivery_rate),
                        defectRatePpm: Number(supplier.defect_rate_ppm),
                        financialRiskScore: Number(supplier.financial_risk_score),
                        geopoliticalRiskScore: Number(supplier.geopolitical_risk_score),
                        capacityRiskScore: Number(supplier.capacity_risk_score),
                    }),
                    Number(supplier.on_time_delivery_rate),
                );

                const { error } = await client.from("suppliers").upsert(
                    supplier as never,
                    { onConflict: "workspace_id,code" },
                );

                if (error) errorCount++;
                else validCount++;
            } catch {
                errorCount++;
            }
        }
    } else if (dataset === "product_suppliers") {
        const [{ data: products, error: productsError }, { data: suppliers, error: suppliersError }, { data: existingMappings, error: mappingsError }] =
            await Promise.all([
                client.from("products").select("id,sku,unit_cost").eq("workspace_id", workspaceId),
                client.from("suppliers").select("id,code,lead_time_days").eq("workspace_id", workspaceId),
                client.from("product_suppliers").select("product_id,supplier_id,is_primary").eq("workspace_id", workspaceId),
            ]);
        assertLookupSucceeded("Products", productsError);
        assertLookupSucceeded("Suppliers", suppliersError);
        assertLookupSucceeded("Product-supplier mappings", mappingsError);

        const productMap = new Map((products ?? []).map((product) => [product.sku, product]));
        const supplierMap = new Map((suppliers ?? []).map((supplier) => [supplier.code, supplier]));
        const candidates: Array<{
            rowIndex: number;
            productId: string;
            supplierId: string;
            sku: string;
            supplierCode: string;
            unitCost: number;
            leadTimeDays: number;
            moq: number;
            isPrimary: boolean;
        }> = [];
        const invalidRows = new Set<number>();
        const duplicatePairs = new Map<string, number[]>();
        const primaryRowsByProduct = new Map<string, number[]>();

        for (const [rowIndex, row] of rows.entries()) {
            try {
                const sku = String(row["sku"] ?? "").trim();
                const supplierCode = String(row["supplier_code"] ?? "").trim();
                const product = productMap.get(sku);
                const supplier = supplierMap.get(supplierCode);
                if (!sku) throw new Error("SKU is required.");
                if (!supplierCode) throw new Error("Supplier Code is required.");
                if (!product) throw new Error(`SKU ${sku} was not found in this workspace.`);
                if (!supplier) throw new Error(`Supplier Code ${supplierCode} was not found in this workspace.`);

                const unitCostRaw = row["unit_cost"];
                const unitCost = unitCostRaw === undefined || unitCostRaw === ""
                    ? Number(product.unit_cost)
                    : Number(unitCostRaw);
                if (!Number.isFinite(unitCost) || unitCost < 0) {
                    throw new Error("Relationship Unit Cost must be a valid non-negative number.");
                }
                if (Math.round(unitCost * 100) !== unitCost * 100) {
                    throw new Error("Relationship Unit Cost must have no more than two decimal places.");
                }

                const leadTimeRaw = row["lead_time_days"];
                const leadTimeDays = leadTimeRaw === undefined || leadTimeRaw === ""
                    ? supplier.lead_time_days
                    : Number(leadTimeRaw);
                if (!Number.isSafeInteger(leadTimeDays) || leadTimeDays < 0 || leadTimeDays > 2_147_483_647) {
                    throw new Error("Relationship Lead Time must be a non-negative whole number of days.");
                }

                const moqRaw = row["moq"];
                const moq = moqRaw === undefined || moqRaw === "" ? Number.NaN : Number(moqRaw);
                if (!Number.isSafeInteger(moq) || moq < 0 || moq > 2_147_483_647) {
                    throw new Error("MOQ must be a non-negative whole number.");
                }

                const primaryRaw = row["is_primary"];
                const primaryValue = typeof primaryRaw === "boolean"
                    ? String(primaryRaw)
                    : String(primaryRaw ?? "").trim().toLowerCase();
                const primaryValues: Record<string, boolean> = {
                    true: true,
                    yes: true,
                    y: true,
                    "1": true,
                    false: false,
                    no: false,
                    n: false,
                    "0": false,
                };
                if (!(primaryValue in primaryValues)) {
                    throw new Error("Is Primary must be true/false, yes/no, or 1/0.");
                }
                const isPrimary = primaryValues[primaryValue];
                const candidate = {
                    rowIndex,
                    productId: product.id,
                    supplierId: supplier.id,
                    sku,
                    supplierCode,
                    unitCost,
                    leadTimeDays,
                    moq,
                    isPrimary,
                };
                candidates.push(candidate);

                const pairKey = `${candidate.productId}:${candidate.supplierId}`;
                duplicatePairs.set(pairKey, [...(duplicatePairs.get(pairKey) ?? []), rowIndex]);
                if (isPrimary) {
                    primaryRowsByProduct.set(candidate.productId, [
                        ...(primaryRowsByProduct.get(candidate.productId) ?? []),
                        rowIndex,
                    ]);
                }
            } catch (error) {
                errorCount++;
                invalidRows.add(rowIndex);
                addRowError(rowIndex + 1, "validation", error);
            }
        }

        for (const [pairKey, rowIndexes] of duplicatePairs) {
            if (rowIndexes.length < 2) continue;
            for (const rowIndex of rowIndexes) {
                if (invalidRows.has(rowIndex)) continue;
                invalidRows.add(rowIndex);
                errorCount++;
                addRowError(
                    rowIndex + 1,
                    "validation",
                    new Error("The import contains this SKU and Supplier Code more than once."),
                );
            }
            duplicatePairs.delete(pairKey);
        }

        for (const [productId, rowIndexes] of primaryRowsByProduct) {
            if (rowIndexes.length < 2) continue;
            const product = (products ?? []).find((item) => item.id === productId);
            for (const rowIndex of rowIndexes) {
                if (invalidRows.has(rowIndex)) continue;
                invalidRows.add(rowIndex);
                errorCount++;
                addRowError(
                    rowIndex + 1,
                    "validation",
                    new Error(`Only one primary supplier can be imported for SKU ${product?.sku ?? "in this row"}.`),
                );
            }
        }

        const existingPrimaryByProduct = new Map<string, string>();
        for (const mapping of existingMappings ?? []) {
            if (mapping.is_primary) existingPrimaryByProduct.set(mapping.product_id, mapping.supplier_id);
        }

        for (const candidate of candidates) {
            if (invalidRows.has(candidate.rowIndex)) continue;
            const existingPrimarySupplierId = existingPrimaryByProduct.get(candidate.productId);
            if (candidate.isPrimary && existingPrimarySupplierId && existingPrimarySupplierId !== candidate.supplierId) {
                for (const affected of candidates.filter((item) => item.productId === candidate.productId)) {
                    if (invalidRows.has(affected.rowIndex)) continue;
                    invalidRows.add(affected.rowIndex);
                    errorCount++;
                    addRowError(
                        affected.rowIndex + 1,
                        "validation",
                        new Error(
                            `SKU ${candidate.sku} already has a different primary supplier. Importing a replacement is not supported; resolve the existing mapping through an approved process first.`,
                        ),
                    );
                }
            }
        }

        for (const candidate of candidates) {
            if (invalidRows.has(candidate.rowIndex)) continue;
            const { error } = await client.from("product_suppliers").upsert(
                {
                    workspace_id: workspaceId,
                    product_id: candidate.productId,
                    supplier_id: candidate.supplierId,
                    unit_cost: candidate.unitCost,
                    lead_time_days: candidate.leadTimeDays,
                    moq: candidate.moq,
                    is_primary: candidate.isPrimary,
                } as never,
                { onConflict: "product_id,supplier_id" },
            );
            if (error) {
                errorCount++;
                addRowError(candidate.rowIndex + 1, "product_suppliers", error);
            } else {
                validCount++;
            }
        }
    } else if (dataset === "inventory_positions") {
        const { data: products, error: productsError } = await client.from("products").select("id, sku").eq("workspace_id", workspaceId);
        assertLookupSucceeded("Products", productsError);
        const { data: sites, error: sitesError } = await client.from("sites").select("id, code").eq("workspace_id", workspaceId);
        assertLookupSucceeded("Sites", sitesError);

        const productMap = new Map((products ?? []).map((p) => [p.sku, p.id]));
        const siteMap = new Map((sites ?? []).map((s) => [s.code, s.id]));

        for (const row of rows) {
            try {
                const sku = String(row["sku"] || row["SKU"] || "").trim();
                const siteCode = String(row["site_code"] || row["Site"] || row["site"] || "").trim();

                const productId = productMap.get(sku);
                const siteId = siteMap.get(siteCode);

                if (!productId || !siteId) { errorCount++; continue; }

                const position: Record<string, unknown> = { workspace_id: workspaceId, product_id: productId, site_id: siteId };
                const fields = [
                    ["on_hand_units", row["on_hand_units"] ?? row["OnHand"]],
                    ["on_order_units", row["on_order_units"] ?? row["OnOrder"]],
                    ["allocated_units", row["allocated_units"] ?? row["Allocated"]],
                    ["safety_stock_units", row["safety_stock_units"] ?? row["SafetyStock"]],
                    ["reorder_point_units", row["reorder_point_units"] ?? row["ReorderPoint"]],
                    ["avg_daily_demand", row["avg_daily_demand"] ?? row["AvgDemand"]],
                ] as const;
                for (const [column, value] of fields) {
                    if (value !== undefined && value !== "") {
                        const numericValue = Number(value);
                        if (!Number.isFinite(numericValue)) throw new Error(`Invalid ${column}`);
                        position[column] = numericValue;
                    }
                }
                if (["on_hand_units", "on_order_units", "allocated_units", "safety_stock_units", "reorder_point_units", "avg_daily_demand"].some((field) => position[field] === undefined)) {
                    errorCount++;
                    continue;
                }

                const { error } = await client.from("inventory_positions").upsert(
                    position as never,
                    { onConflict: "product_id,site_id" },
                );

                if (error) errorCount++;
                else validCount++;
            } catch {
                errorCount++;
            }
        }
    } else if (dataset === "demand_history") {
        const { data: products, error: productsError } = await client.from("products").select("id, sku").eq("workspace_id", workspaceId);
        assertLookupSucceeded("Products", productsError);
        const { data: sites, error: sitesError } = await client.from("sites").select("id, code").eq("workspace_id", workspaceId);
        assertLookupSucceeded("Sites", sitesError);

        const productMap = new Map((products ?? []).map((p) => [p.sku, p.id]));
        const siteMap = new Map((sites ?? []).map((s) => [s.code, s.id]));

        for (const row of rows) {
            try {
                const sku = String(row["sku"] || row["SKU"] || "").trim();
                const siteCode = String(row["site_code"] || row["Site"] || row["site"] || "").trim();
                const periodValue = row["period_month"] || row["Month"] || row["period"];
                const unitsValue = row["units"] ?? row["Units"] ?? row["units_sold"];
                const units = unitsValue === undefined || unitsValue === "" ? Number.NaN : Number(unitsValue);
                const revenueValue = row["revenue_usd"] ?? row["revenue"] ?? row["Revenue"];
                const revenueUsd = revenueValue === undefined || revenueValue === "" ? Number.NaN : Number(revenueValue);

                const productId = productMap.get(sku);
                const siteId = siteMap.get(siteCode);

                if (!productId || !siteId || !periodValue || !Number.isFinite(units) || !Number.isFinite(revenueUsd)) { errorCount++; continue; }

                const demand: Record<string, unknown> = {
                    workspace_id: workspaceId,
                    product_id: productId,
                    site_id: siteId,
                    period_month: parseMonthPeriod(periodValue),
                    units,
                };
                demand.revenue_usd = revenueUsd;

                const { error } = await client.from("demand_history").upsert(
                    demand as never,
                    { onConflict: "product_id,site_id,period_month" },
                );

                if (error) errorCount++;
                else validCount++;
            } catch {
                errorCount++;
            }
        }
    } else if (dataset === "purchase_orders") {
        const { data: suppliers, error: suppliersError } = await client.from("suppliers").select("id, code").eq("workspace_id", workspaceId);
        assertLookupSucceeded("Suppliers", suppliersError);
        const { data: sites, error: sitesError } = await client.from("sites").select("id, code").eq("workspace_id", workspaceId);
        assertLookupSucceeded("Sites", sitesError);
        const { data: products, error: productsError } = await client.from("products").select("id, sku").eq("workspace_id", workspaceId);
        assertLookupSucceeded("Products", productsError);

        const supplierMap = new Map((suppliers ?? []).map((s) => [s.code, s.id]));
        const siteMap = new Map((sites ?? []).map((s) => [s.code, s.id]));
        const productMap = new Map((products ?? []).map((p) => [p.sku, p.id]));
        for (const [rowIndex, row] of rows.entries()) {
            let stage: ImportRowError["stage"] = "validation";
            try {
                const poNumber = String(row["po_number"] || row["PONumber"] || row["po"] || "").trim();
                const supplierCode = String(row["supplier_code"] || row["SupplierCode"] || "").trim();
                const siteCode = String(row["site_code"] || row["Site"] || "").trim();

                const supplierId = supplierMap.get(supplierCode);
                const siteId = siteMap.get(siteCode);

                const orderDate = normalizeDateToIso(row["order_date"] ?? row["OrderDate"], "Order Date");
                const promisedDate = normalizeDateToIso(row["promised_date"] ?? row["PromisedDate"], "Promised Date");
                const valueRaw = row["total_value_usd"] ?? row["total_value"] ?? row["Value"];
                const totalValueUsd = valueRaw === undefined || valueRaw === "" ? Number.NaN : Number(valueRaw);

                const status = String(row["status"] ?? "").trim().toUpperCase();
                if (!poNumber || !supplierCode || !siteCode || !status || !Number.isFinite(totalValueUsd)) {
                    throw new Error("Missing PO number, supplier code, site code, status, or numeric total value.");
                }
                if (!supplierId) throw new Error(`Supplier code ${supplierCode} was not found in this workspace.`);
                if (!siteId) throw new Error(`Site code ${siteCode} was not found in this workspace.`);

                const purchaseOrder: Record<string, unknown> = {
                    workspace_id: workspaceId,
                    po_number: poNumber,
                    supplier_id: supplierId,
                    site_id: siteId,
                    order_date: orderDate,
                    promised_date: promisedDate,
                    created_by: userId,
                };
                purchaseOrder.status = status;
                purchaseOrder.total_value_usd = totalValueUsd;

                stage = "purchase_orders";
                const { data: poRes, error } = await client.from("purchase_orders").upsert(
                    purchaseOrder as never,
                    { onConflict: "workspace_id,po_number" },
                ).select("id").single();

                if (error) {
                    errorCount++;
                    addRowError(rowIndex + 1, stage, error);
                    continue;
                }
                if (!poRes) {
                    errorCount++;
                    addRowError(rowIndex + 1, stage, new Error("Upsert returned no purchase order row."));
                    continue;
                } else {
                    // Insert PO Line if SKU details exist in row
                    const sku = String(row["sku"] || row["SKU"] || "").trim();
                    if (sku) {
                        stage = "purchase_order_lines";
                        if (!productMap.has(sku)) throw new Error(`Product SKU ${sku} was not found in this workspace.`);
                        const productId = productMap.get(sku)!;
                        const quantityValue = row["quantity_units"] ?? row["quantity"];
                        const costValue = row["unit_cost"] ?? row["cost"];
                        const qty = quantityValue === undefined || quantityValue === "" ? Number.NaN : Number(quantityValue);
                        const unitCost = costValue === undefined || costValue === "" ? Number.NaN : Number(costValue);
                        if (!Number.isFinite(qty) || !Number.isFinite(unitCost)) {
                            throw new Error("Purchase order line requires numeric quantity and unit cost.");
                        }
                        const { error: lineError } = await client.from("purchase_order_lines").insert({
                            workspace_id: workspaceId,
                            purchase_order_id: poRes.id,
                            product_id: productId,
                            quantity_units: qty,
                            unit_cost: unitCost,
                        });
                        if (lineError) {
                            errorCount++;
                            addRowError(rowIndex + 1, stage, lineError);
                            continue;
                        }
                    }
                    validCount++;
                }
            } catch (error) {
                errorCount++;
                addRowError(rowIndex + 1, stage, error);
            }
        }
    } else if (dataset === "shipments") {
        const { data: sites, error: sitesError } = await client.from("sites").select("id, code").eq("workspace_id", workspaceId);
        assertLookupSucceeded("Sites", sitesError);
        const { data: pos, error: posError } = await client.from("purchase_orders").select("id, po_number").eq("workspace_id", workspaceId);
        assertLookupSucceeded("Purchase orders", posError);

        const siteMap = new Map((sites ?? []).map((s) => [s.code, s.id]));
        const poMap = new Map((pos ?? []).map((p) => [p.po_number, p.id]));

        for (const [rowIndex, row] of rows.entries()) {
            try {
                const shipmentRef = String(row["shipment_ref"] || row["ShipmentRef"] || row["ref"] || "").trim();
                if (!shipmentRef) { errorCount++; continue; }

                const siteCode = String(row["site_code"] || row["Site"] || row["destination"] || "").trim();
                const destinationSiteId = siteMap.get(siteCode);

                if (!destinationSiteId) { errorCount++; continue; }

                const poRef = String(row["po_number"] || row["PONumber"] || "").trim();
                const poId = poMap.get(poRef) ?? null;

                const carrier = String(row["carrier"] || row["Carrier"] || "").trim();
                const origin = String(row["origin_location"] || row["origin"] || "").trim();
                const lane = String(row["lane"] || row["Lane"] || "").trim();
                const shipDate = normalizeDateToIso(row["ship_date"], "Ship Date");
                const etaDate = normalizeDateToIso(row["eta_date"] ?? row["ETA"], "ETA Date");
                const unitsValue = row["units"] ?? row["Units"];
                const costValue = row["freight_cost_usd"] ?? row["freight_cost"];
                const units = unitsValue === undefined || unitsValue === "" ? Number.NaN : Number(unitsValue);
                const freightCost = costValue === undefined || costValue === "" ? Number.NaN : Number(costValue);
                const mode = String(row["mode"] ?? "").trim().toUpperCase();
                const status = String(row["status"] ?? "").trim().toUpperCase();
                if (!carrier || !origin || !lane || !shipDate || !etaDate || !mode || !status || !Number.isFinite(units) || !Number.isFinite(freightCost)) { errorCount++; continue; }

                const shipment: Record<string, unknown> = {
                    workspace_id: workspaceId,
                    shipment_ref: shipmentRef,
                    purchase_order_id: poId,
                    carrier,
                    origin_location: origin,
                    destination_site_id: destinationSiteId,
                    lane,
                    ship_date: shipDate,
                    eta_date: etaDate,
                };
                shipment.mode = mode;
                shipment.status = status;
                shipment.units = units;
                shipment.freight_cost_usd = freightCost;

                const { error } = await client.from("shipments").upsert(
                    shipment as never,
                    { onConflict: "workspace_id,shipment_ref" },
                );

                if (error) {
                    errorCount++;
                    console.error("[shipments] Upsert failed", {
                        row: rowIndex + 1,
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                    });
                    addRowError(rowIndex + 1, "shipments", error);
                } else validCount++;
            } catch (error) {
                errorCount++;
                addRowError(rowIndex + 1, "shipments", error);
            }
        }
    } else {
        errorCount = rows.length;
    }

    const qualityScore = Math.round((validCount / Math.max(1, rows.length)) * 100 * 10) / 10;
    const status = getImportStatus(rows.length, validCount);
    const importedRecord = await finishImportRecord(client, workspaceId, auditRecord.id, {
        validCount,
        errorCount,
        qualityScore,
        status,
    });

    await flushImportEvents(client, workspaceId, importedRecord.id);

    return {
        success: status === "COMPLETED",
        validCount,
        errorCount,
        rowErrors,
        qualityScore,
        status,
        record: importedRecord,
    };
    } catch (error) {
        if (errorCount === 0) errorCount = Math.max(0, rows.length - validCount);
        const status = getImportStatus(rows.length, validCount);
        const qualityScore = Math.round((validCount / Math.max(1, rows.length)) * 100 * 10) / 10;
        const failedImportRecord = await finishImportRecord(client, workspaceId, auditRecord.id, {
            validCount,
            errorCount,
            qualityScore,
            status,
        });
        await flushImportEvents(client, workspaceId, failedImportRecord.id);
        throw error;
    }
}
