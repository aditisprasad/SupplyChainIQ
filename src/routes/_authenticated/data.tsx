import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    FileText,
    History,
    Database,
    RefreshCw,
    Download,
    ArrowRight,
} from "lucide-react";

import {
    DataTable,
    KpiCard,
    PageHeader,
    Panel,
    StatusPill,
    dateLabel,
    num,
    pct,
} from "@/components/scm/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { domainEventsQuery, importHistoryQuery, sessionQuery } from "@/lib/scm/queries";
import {
    previewProductSupplierMappings,
    processDataImport,
    retryDomainEventDelivery,
} from "@/lib/scm/scm.functions";
import { normalizeExcelDateToMonth } from "@/lib/scm/date-normalization";

export const Route = createFileRoute("/_authenticated/data")({
    head: () => ({
        meta: [
            { title: "Data Management Center — SUPPLYCHAINIQ" },
            {
                name: "description",
                content:
                    "Ingest CSV and XLSX files, map columns, validate operational data quality, and track database import history.",
            },
        ],
    }),
    loader: async ({ context }) => {
        await Promise.all([
            context.queryClient.ensureQueryData(importHistoryQuery),
            context.queryClient.ensureQueryData(sessionQuery),
        ]);
    },
    component: DataManagementPage,
});

const DATASETS = [
    { id: "products", label: "Product Master", hint: "SKU, Name, Category, Unit Cost, Unit Price, ABC Class, Lifecycle Stage" },
    { id: "suppliers", label: "Supplier Scorecard", hint: "Code, Name, Lead Time, OTIF, Defect PPM, Risk Scores, Spend" },
    { id: "product_suppliers", label: "Product-Supplier Mapping", hint: "SKU, Supplier Code, Unit Cost, Lead Time, MOQ, Is Primary" },
    { id: "inventory_positions", label: "Stock Positions", hint: "SKU, Site, On Hand, On Order, Allocated, Safety Stock, ROP, Daily Demand" },
    { id: "demand_history", label: "Demand History", hint: "SKU, Site, Month, Units, Revenue" },
    { id: "purchase_orders", label: "Purchase Orders", hint: "PO Number, Supplier, Site, Dates, Status, Value" },
    { id: "shipments", label: "Shipments & Freight", hint: "Shipment Ref, Carrier, Mode, Status, Origin, ETA, Units, Freight Cost" },
];

const HEADER_ALIASES: Record<string, string[]> = {
    code: ["supplier code", "supplier_code", "suppliercode", "code"],
    sku: ["sku", "product sku", "product code"],
    supplier_code: ["supplier code", "supplier_code", "suppliercode"],
    unit_cost: ["unit cost", "unit_cost", "cost"],
    lead_time_days: ["lead time (days)", "lead time", "lead_time_days", "leadtime"],
    moq: ["moq", "minimum order quantity", "minimum order qty"],
    is_primary: ["is primary", "is_primary", "primary supplier", "primary"],
    name: ["supplier name", "supplier_name", "suppliername", "name"],
    category: ["category"],
    country: ["country"],
    region: ["region"],
    tier: ["tier"],
    on_time_delivery_rate: ["otif %", "otif percent", "on time delivery rate", "on_time_delivery_rate", "otif"],
    defect_rate_ppm: ["defect rate (ppm)", "defect ppm", "defect rate", "defect_rate_ppm", "defect ppm"],
    financial_risk_score: ["financial risk (0-100)", "financial risk", "financial_risk_score", "financial risk score"],
    geopolitical_risk_score: ["geopolitical risk (0-100)", "geopolitical risk", "geopolitical_risk_score", "geopolitical risk score"],
    capacity_risk_score: ["capacity risk (0-100)", "capacity risk", "capacity_risk_score", "capacity risk score"],
    annual_spend_usd: ["annual spend ($)", "annual spend", "annual_spend_usd", "spend", "annual spend usd"],
};

function normalizeHeader(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function headerMatches(header: string, aliases: string[]): boolean {
    const normalizedHeader = normalizeHeader(header);
    return aliases.some((alias) => normalizeHeader(alias) === normalizedHeader);
}

const DATASET_SCHEMAS: Record<string, { field: string; label: string; required: boolean }[]> = {
    products: [
        { field: "sku", label: "SKU / Code", required: true },
        { field: "name", label: "Product Name", required: true },
        { field: "category", label: "Category", required: true },
        { field: "unit_cost", label: "Unit Cost ($)", required: true },
        { field: "unit_price", label: "Unit Price ($)", required: true },
        { field: "abc_class", label: "ABC Class", required: true },
        { field: "lifecycle_stage", label: "Lifecycle Stage", required: true },
    ],
    suppliers: [
        { field: "code", label: "Supplier Code", required: true },
        { field: "name", label: "Supplier Name", required: true },
        { field: "category", label: "Category", required: true },
        { field: "country", label: "Country", required: true },
        { field: "region", label: "Region", required: true },
        { field: "tier", label: "Tier", required: true },
        { field: "lead_time_days", label: "Lead Time (Days)", required: true },
        { field: "on_time_delivery_rate", label: "OTIF %", required: true },
        { field: "defect_rate_ppm", label: "Defect Rate (PPM)", required: true },
        { field: "financial_risk_score", label: "Financial Risk (0-100)", required: true },
        { field: "geopolitical_risk_score", label: "Geopolitical Risk (0-100)", required: true },
        { field: "capacity_risk_score", label: "Capacity Risk (0-100)", required: true },
        { field: "annual_spend_usd", label: "Annual Spend ($)", required: true },
    ],
    product_suppliers: [
        { field: "sku", label: "Product SKU", required: true },
        { field: "supplier_code", label: "Supplier Code", required: true },
        { field: "unit_cost", label: "Relationship Unit Cost ($)", required: false },
        { field: "lead_time_days", label: "Relationship Lead Time (Days)", required: false },
        { field: "moq", label: "MOQ", required: true },
        { field: "is_primary", label: "Is Primary (true/false)", required: true },
    ],
    inventory_positions: [
        { field: "sku", label: "Product SKU", required: true },
        { field: "site_code", label: "Site Code", required: true },
        { field: "on_hand_units", label: "On Hand Units", required: true },
        { field: "on_order_units", label: "On Order Units", required: true },
        { field: "allocated_units", label: "Allocated Units", required: true },
        { field: "safety_stock_units", label: "Safety Stock", required: true },
        { field: "reorder_point_units", label: "Reorder Point", required: true },
        { field: "avg_daily_demand", label: "Average Daily Demand", required: true },
    ],
    demand_history: [
        { field: "sku", label: "Product SKU", required: true },
        { field: "site_code", label: "Site Code", required: true },
        { field: "period_month", label: "Month (YYYY-MM)", required: true },
        { field: "units", label: "Units Sold", required: true },
        { field: "revenue_usd", label: "Revenue ($)", required: true },
    ],
    purchase_orders: [
        { field: "po_number", label: "PO Number", required: true },
        { field: "supplier_code", label: "Supplier Code", required: true },
        { field: "site_code", label: "Destination Site", required: true },
        { field: "order_date", label: "Order Date", required: true },
        { field: "promised_date", label: "Promised Date", required: true },
        { field: "status", label: "Status", required: true },
        { field: "total_value_usd", label: "Total Value ($)", required: true },
    ],
    shipments: [
        { field: "shipment_ref", label: "Shipment Ref", required: true },
        { field: "carrier", label: "Carrier", required: true },
        { field: "mode", label: "Mode (OCEAN/AIR/ROAD)", required: true },
        { field: "status", label: "Status", required: true },
        { field: "origin_location", label: "Origin", required: true },
        { field: "site_code", label: "Destination Site Code", required: true },
        { field: "lane", label: "Lane", required: true },
        { field: "ship_date", label: "Ship Date", required: true },
        { field: "eta_date", label: "ETA Date", required: true },
        { field: "units", label: "Total Units", required: true },
        { field: "freight_cost_usd", label: "Freight Cost ($)", required: true },
    ],
};

type ProductSupplierPreview = Awaited<ReturnType<typeof previewProductSupplierMappings>>[number];

function validateProductSupplierPreview(rows: ProductSupplierPreview[]) {
    const pairCounts = new Map<string, number>();
    const primaryCounts = new Map<string, number>();
    for (const row of rows) {
        const pair = `${row.sku}:${row.supplierCode}`;
        pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
        if (String(row.isPrimary ?? "").trim().toLowerCase() === "true" || row.isPrimary === true) {
            primaryCounts.set(row.sku, (primaryCounts.get(row.sku) ?? 0) + 1);
        }
    }

    return rows.map((row) => {
        const errors: string[] = [];
        if (!row.product) errors.push(`SKU ${row.sku || "is required"} was not found in this workspace.`);
        if (!row.supplier) errors.push(`Supplier Code ${row.supplierCode || "is required"} was not found in this workspace.`);
        const unitCost = Number(row.relationshipUnitCost);
        if (!Number.isFinite(unitCost) || unitCost < 0 || Math.round(unitCost * 100) !== unitCost * 100) {
            errors.push("Relationship Unit Cost must be non-negative with no more than two decimal places.");
        }
        const leadTime = Number(row.relationshipLeadTimeDays);
        if (!Number.isSafeInteger(leadTime) || leadTime < 0) {
            errors.push("Relationship Lead Time must be a non-negative whole number of days.");
        }
        const moq = Number(row.moq);
        if (row.moq === null || row.moq === undefined || row.moq === "" || !Number.isSafeInteger(moq) || moq < 0) {
            errors.push("MOQ must be supplied as a non-negative whole number.");
        }
        const primaryValue = typeof row.isPrimary === "boolean"
            ? String(row.isPrimary)
            : String(row.isPrimary ?? "").trim().toLowerCase();
        const booleanValues: Record<string, boolean> = {
            true: true, yes: true, y: true, "1": true,
            false: false, no: false, n: false, "0": false,
        };
        if (!(primaryValue in booleanValues)) {
            errors.push("Is Primary must be true/false, yes/no, or 1/0.");
        } else if (
            booleanValues[primaryValue] &&
            row.currentPrimarySupplier &&
            row.currentPrimarySupplier.code !== row.supplierCode
        ) {
            errors.push(`A different primary supplier is already configured: ${row.currentPrimarySupplier.code}.`);
        }
        if ((pairCounts.get(`${row.sku}:${row.supplierCode}`) ?? 0) > 1) {
            errors.push("This SKU and Supplier Code pair appears more than once in the file.");
        }
        if ((primaryCounts.get(row.sku) ?? 0) > 1) {
            errors.push("Only one primary supplier can be selected for a product in an import.");
        }
        return { row: row.row, errors };
    });
}

function DataManagementPage() {
    const { data: importHistory } = useSuspenseQuery(importHistoryQuery);
    const history = importHistory.records;
    const { data: session } = useSuspenseQuery(sessionQuery);
    const eventQuery = useQuery(domainEventsQuery);
    const queryClient = useQueryClient();
    const runImport = useServerFn(processDataImport);
    const retryEventDelivery = useServerFn(retryDomainEventDelivery);
    const previewMappings = useServerFn(previewProductSupplierMappings);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Workflow steps: 1 = Upload, 2 = Mapping, 3 = Review & Quality, 4 = Success
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    const [selectedDataset, setSelectedDataset] = useState("products");
    const [file, setFile] = useState<File | null>(null);
    const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
    const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({});
    const [mappingPreview, setMappingPreview] = useState<
        Awaited<ReturnType<typeof previewProductSupplierMappings>> | null
    >(null);
    const [date1904, setDate1904] = useState(false);
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [lastImport, setLastImport] = useState<{
        status: "COMPLETED" | "PARTIAL" | "FAILED";
        validCount: number;
        errorCount: number;
        qualityScore: number;
        recordId: string;
        rowErrors: Array<{ row: number; stage: string; code?: string; message: string; details?: string; hint?: string }>;
    } | null>(null);
    const [historyErrors, setHistoryErrors] = useState<Record<string, Array<{ row: number; stage: string; code?: string; message: string; details?: string; hint?: string }>>>({});
    const retryEventsMutation = useMutation({
        mutationFn: () => retryEventDelivery(),
        onSuccess: async (result) => {
            await queryClient.invalidateQueries({ queryKey: ["scm", "domain-events"] });
            toast.success(`Retried delivery for ${num(result.attempted)} event(s).`);
        },
        onError: (error: Error) => toast.error(`Event retry failed: ${error.message}`),
    });

    const importMutation = useMutation({
        mutationFn: (data: { dataset: string; filename: string; rows: Record<string, unknown>[] }) =>
            runImport({ data }),
        onSuccess: (res) => {
            const rowErrors = res.rowErrors ?? [];
            setLastImport({ ...res, recordId: res.record.id, rowErrors });
            if (rowErrors.length > 0) {
                setHistoryErrors((existing) => ({ ...existing, [res.record.id]: rowErrors }));
            }
            if (res.status === "FAILED") {
                toast.error(`Import failed. ${res.errorCount} row errors were recorded.`, {
                    description: `Quality Score: ${res.qualityScore}%`,
                });
                setStep(4);
                return;
            }
            if (res.status === "PARTIAL") {
                toast.error(`Import partially completed. ${res.validCount} rows imported; ${res.errorCount} failed.`, {
                    description: `Quality Score: ${res.qualityScore}%`,
                });
            } else {
                toast.success(`Import successful. ${res.validCount} rows added to database.`, {
                    description: `Quality Score: ${res.qualityScore}%`,
                });
            }
            setStep(4);
        },
        onError: (error: Error) => toast.error(`Import failed: ${error.message}`),
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["scm"] }),
    });
    const mappingPreviewMutation = useMutation({
        mutationFn: (rows: Record<string, unknown>[]) => previewMappings({ data: { rows } }),
        onSuccess: (result) => {
            setMappingPreview(result);
            setStep(3);
        },
        onError: (error: Error) => toast.error(`Unable to resolve workspace mappings: ${error.message}`),
    });

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) processFile(selectedFile);
    }

    function processFile(selectedFile: File) {
        setFile(selectedFile);
        setIsProcessingFile(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
                setDate1904(Boolean(wb.Workbook?.WBProps?.date1904));
                const wsName = wb.SheetNames[0];
                if (!wsName) {
                    toast.error("File is empty or contains no readable sheets.");
                    setIsProcessingFile(false);
                    return;
                }
                const ws = wb.Sheets[wsName];
                if (!ws) {
                    toast.error("Unable to read worksheet content.");
                    setIsProcessingFile(false);
                    return;
                }

                const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
                if (data.length === 0 || !data[0]) {
                    toast.error("File is empty or contains no readable rows.");
                    setIsProcessingFile(false);
                    return;
                }

                const headers = Object.keys(data[0]);
                setParsedHeaders(headers);
                setParsedRows(data);
                setMappingPreview(null);

                // Auto-map headers to schema fields while tolerating display labels and CSV aliases.
                const schema = DATASET_SCHEMAS[selectedDataset] || [];
                const initialMap: Record<string, string> = {};

                schema.forEach((s) => {
                    const aliases = HEADER_ALIASES[s.field] ?? [s.field, s.label];
                    const match = headers.find((h) => headerMatches(h, aliases));
                    if (match) initialMap[s.field] = match;
                });

                setMappings(initialMap);
                setStep(2);
            } catch (err) {
                toast.error("Failed to parse file. Please select a valid CSV or XLSX spreadsheet.");
            } finally {
                setIsProcessingFile(false);
            }
        };
        reader.readAsBinaryString(selectedFile);
    }

    function getMappedRows() {
        return parsedRows.map((row) => {
            const result: Record<string, unknown> = {};
            Object.entries(mappings).forEach(([targetField, sourceHeader]) => {
                if (sourceHeader && row[sourceHeader] !== undefined) {
                    const value = row[sourceHeader];
                    result[targetField] = targetField === "period_month"
                        ? normalizeExcelDateToMonth(value, date1904) ?? value
                        : value;
                }
            });
            return result;
        });
    }

    function continueToReview() {
        if (selectedDataset === "product_suppliers") {
            mappingPreviewMutation.mutate(getMappedRows());
            return;
        }
        setStep(3);
    }

    function executeImport() {
        if (!file || parsedRows.length === 0) return;

        importMutation.mutate({
            dataset: selectedDataset,
            filename: file.name,
            rows: getMappedRows(),
        });
    }

    const schema = DATASET_SCHEMAS[selectedDataset] || [];
    const mappedCount = Object.keys(mappings).filter((k) => !!mappings[k]).length;
    const requiredCount = schema.filter((s) => s.required).length;
    const missingRequired = schema.filter((s) => s.required && !mappings[s.field]);

    const qualityScore = Math.min(
        100,
        Math.round(
            (mappedCount / Math.max(1, schema.length)) * 100 * 0.4 +
            (missingRequired.length === 0 ? 60 : 30),
        ),
    );
    const productSupplierValidation = selectedDataset === "product_suppliers" && mappingPreview
        ? validateProductSupplierPreview(mappingPreview)
        : [];
    const invalidProductSupplierRows = productSupplierValidation.filter((item) => item.errors.length > 0);

    return (
        <>
            <PageHeader
                title="Data Management Center"
                subtitle="Ingest CSV/XLSX operational data, map schema fields, review quality metrics, and update database records"
                actions={
                    <Button
                        onClick={() => {
                            setStep(1);
                            setFile(null);
                        }}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                    >
                        <RefreshCw className="size-3.5" />
                        New Ingestion
                    </Button>
                }
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    label="Database Status"
                    value={importHistory.error ? "Unavailable" : "Available"}
                    hint={importHistory.error ?? "Import history query succeeded"}
                    tone={importHistory.error ? "danger" : "success"}
                    icon={Database}
                />
                <KpiCard
                    label="Total Imports"
                    value={importHistory.error ? "—" : num(history.length)}
                    hint={importHistory.error ? "History unavailable" : "Tracked executions"}
                    tone="primary"
                    icon={History}
                />
                <KpiCard
                    label="Avg Quality Score"
                    value={importHistory.error ? "—" : history.length > 0 ? pct(history.reduce((a, b) => a + b.qualityScore, 0) / history.length) : "—"}
                    hint="Validation pass rate"
                    tone="success"
                    icon={CheckCircle2}
                />
                <KpiCard
                    label="Ingestion Mode"
                    value="Database Upsert"
                    hint={session.canWrite ? "Write access enabled" : "Read-only access"}
                    tone="default"
                    icon={FileSpreadsheet}
                />
            </div>

            <Tabs defaultValue="upload" className="mt-4">
                <TabsList className="bg-muted/60 p-1">
                    <TabsTrigger value="upload" className="gap-2 text-xs font-semibold">
                        <Upload className="size-3.5" />
                        Ingest & Upload Data
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2 text-xs font-semibold">
                        <History className="size-3.5" />
                        Import History Log
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-4">
                    {/* STEP 1: UPLOAD FILE */}
                    {step === 1 && (
                        <Panel
                            title="Step 1: Select Dataset & Upload File"
                            description="Upload CSV or XLSX spreadsheets to update database records for your workspace"
                        >
                            <div className="grid gap-6 md:grid-cols-3">
                                <div className="md:col-span-1 space-y-3">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Target Dataset
                                    </Label>
                                    <div className="space-y-2">
                                        {DATASETS.map((d) => (
                                            <div
                                                key={d.id}
                                                onClick={() => setSelectedDataset(d.id)}
                                                className={`cursor-pointer rounded-lg border p-3 transition-all ${selectedDataset === d.id
                                                    ? "border-primary bg-primary/5 shadow-2xs"
                                                    : "border-border/80 hover:border-primary/40 bg-card"
                                                    }`}
                                            >
                                                <p className="text-xs font-semibold text-foreground">{d.label}</p>
                                                <p className="mt-1 text-[11px] text-muted-foreground">{d.hint}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedDataset === "product_suppliers" && (
                                        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                                Relationship cost, lead time, and MOQ are stored on the product-supplier record used for purchase orders. Blank cost and lead time use Product Master and Supplier Scorecard values; they never overwrite those master records. MOQ must be supplied from an approved source. A product can have only one primary supplier; replacing an existing primary is not automatic.
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => {
                                                    const csv = "SKU,Supplier Code,Unit Cost,Lead Time (Days),MOQ,Is Primary\r\n";
                                                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                                                    const url = URL.createObjectURL(blob);
                                                    const link = document.createElement("a");
                                                    link.href = url;
                                                    link.download = "product-supplier-mapping-template.csv";
                                                    link.click();
                                                    URL.revokeObjectURL(url);
                                                }}
                                            >
                                                <Download className="size-3.5" />
                                                Download CSV Template
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="md:col-span-2 flex flex-col justify-center">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.02] p-12 text-center transition-all hover:border-primary hover:bg-primary/5 cursor-pointer"
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            accept=".csv, .xlsx, .xls"
                                            className="hidden"
                                        />
                                        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                                            <Upload className="size-6" />
                                        </div>
                                        <h3 className="text-base font-bold text-foreground">
                                            Drop your spreadsheet here, or browse
                                        </h3>
                                        <p className="mt-1 text-xs text-muted-foreground max-w-md">
                                            Supports CSV, XLSX, and XLS files up to 25MB. System auto-detects column names and maps schema fields.
                                        </p>
                                        <Button variant="outline" size="sm" className="mt-5 gap-2">
                                            <FileText className="size-4" />
                                            Browse Files
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Panel>
                    )}

                    {/* STEP 2: COLUMN MAPPING */}
                    {step === 2 && (
                        <Panel
                            title="Step 2: Map Columns to Database Schema"
                            description={`File: ${file?.name} · Dataset: ${DATASETS.find((d) => d.id === selectedDataset)?.label}`}
                            actions={
                                <Button
                                    onClick={continueToReview}
                                    disabled={missingRequired.length > 0 || mappingPreviewMutation.isPending}
                                    size="sm"
                                    className="gap-2 bg-primary font-medium text-primary-foreground"
                                >
                                    {mappingPreviewMutation.isPending ? "Resolving Workspace Records…" : "Continue to Quality Review"}
                                    <ArrowRight className="size-4" />
                                </Button>
                            }
                        >
                            {missingRequired.length > 0 && (
                                <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                                    <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                                    <span>
                                        Missing required fields: <strong>{missingRequired.map((m) => m.label).join(", ")}</strong>. Please map these fields to proceed.
                                    </span>
                                </div>
                            )}

                            <div className="space-y-3">
                                <DataTable headers={["Database Field", "Required", "Mapped File Column"]}>
                                    {schema.map((s) => (
                                        <tr key={s.field} className="border-t border-border/60">
                                            <td className="px-3.5 py-3 font-semibold text-foreground">
                                                {s.label}
                                                <span className="block text-[11px] font-normal text-muted-foreground">{s.field}</span>
                                            </td>
                                            <td className="px-3.5 py-3">
                                                {s.required ? (
                                                    <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">REQUIRED</span>
                                                ) : (
                                                    <span className="text-[11px] text-muted-foreground">Optional</span>
                                                )}
                                            </td>
                                            <td className="px-3.5 py-3">
                                                <select
                                                    value={mappings[s.field] || ""}
                                                    onChange={(e) => setMappings({ ...mappings, [s.field]: e.target.value })}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="">-- Ignore / Unmapped --</option>
                                                    {parsedHeaders.map((h) => (
                                                        <option key={h} value={h}>
                                                            {h}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </DataTable>
                            </div>
                        </Panel>
                    )}

                    {/* STEP 3: QUALITY REVIEW & IMPORT */}
                    {step === 3 && (
                        <Panel
                            title="Step 3: Data Quality Review & Validation"
                            description="Review validation score before writing records to PostgreSQL database"
                            actions={
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                                        Back to Mapping
                                    </Button>
                                    <Button
                                        onClick={executeImport}
                                        disabled={
                                            importMutation.isPending ||
                                            (selectedDataset === "product_suppliers" && invalidProductSupplierRows.length > 0)
                                        }
                                        size="sm"
                                        className="gap-2 bg-primary font-medium text-primary-foreground"
                                    >
                                        <Database className="size-4" />
                                        {importMutation.isPending ? "Executing Import…" : "Confirm & Import to Database"}
                                    </Button>
                                </div>
                            }
                        >
                            <div className="grid gap-4 sm:grid-cols-3 mb-6">
                                <div className="rounded-xl border border-border bg-card p-4 text-center">
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Total Rows</p>
                                    <p className="num mt-1 text-3xl font-bold text-foreground">{num(parsedRows.length)}</p>
                                </div>
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-center">
                                    <p className="text-xs text-emerald-700 uppercase font-semibold">Mapped Fields</p>
                                    <p className="num mt-1 text-3xl font-bold text-emerald-800">{mappedCount} / {schema.length}</p>
                                </div>
                                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                                    <p className="text-xs text-primary uppercase font-semibold">Mapping Readiness</p>
                                    <p className="num mt-1 text-3xl font-bold text-primary">{qualityScore}%</p>
                                </div>
                            </div>

                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                                Preview Mapped Data (First 5 Rows)
                            </h4>

                            <DataTable headers={schema.map((s) => s.label)}>
                                {parsedRows.slice(0, 5).map((row, idx) => (
                                    <tr key={idx} className="border-t border-border/60">
                                        {schema.map((s) => {
                                            const colHeader = mappings[s.field];
                                            const rawValue = colHeader ? row[colHeader] : undefined;
                                            const value = s.field === "period_month"
                                                ? normalizeExcelDateToMonth(rawValue, date1904) ?? rawValue
                                                : rawValue;
                                            const val = colHeader ? String(value ?? "") : "—";
                                            return (
                                                <td key={s.field} className="px-3.5 py-2.5 text-xs text-foreground">
                                                    {val}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </DataTable>

                            {selectedDataset === "product_suppliers" && (
                                <div className="mt-6 space-y-3">
                                    <div>
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Workspace Product & Supplier Match
                                        </h4>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Records below were resolved only within the active workspace. Blank relationship cost and lead time use the matching Product Master unit cost and Supplier Scorecard lead time. These defaults do not update either master record.
                                        </p>
                                    </div>
                                    <DataTable headers={["Row", "Product", "Supplier", "Relationship Cost", "Lead Time", "MOQ", "Primary", "Existing Primary"]}>
                                        {(mappingPreview ?? []).slice(0, 20).map((item) => (
                                            <tr key={item.row} className="border-t border-border/60">
                                                <td className="px-3.5 py-2.5 text-xs">{item.row}</td>
                                                <td className="px-3.5 py-2.5 text-xs">
                                                    {item.product
                                                        ? <><span className="font-semibold">{item.product.sku}</span><span className="block text-muted-foreground">{item.product.name}</span></>
                                                        : <span className="text-rose-700">SKU {item.sku || "—"} not found</span>}
                                                </td>
                                                <td className="px-3.5 py-2.5 text-xs">
                                                    {item.supplier
                                                        ? <><span className="font-semibold">{item.supplier.code}</span><span className="block text-muted-foreground">{item.supplier.name}</span></>
                                                        : <span className="text-rose-700">Supplier {item.supplierCode || "—"} not found</span>}
                                                </td>
                                                <td className="num px-3.5 py-2.5 text-xs">{String(item.relationshipUnitCost ?? "—")}</td>
                                                <td className="num px-3.5 py-2.5 text-xs">{String(item.relationshipLeadTimeDays ?? "—")}</td>
                                                <td className="num px-3.5 py-2.5 text-xs">{String(item.moq ?? "—")}</td>
                                                <td className="px-3.5 py-2.5 text-xs">{String(item.isPrimary ?? "—")}</td>
                                                <td className="px-3.5 py-2.5 text-xs">
                                                    {item.currentPrimarySupplier
                                                        ? `${item.currentPrimarySupplier.code} · ${item.currentPrimarySupplier.name}`
                                                        : "None"}
                                                </td>
                                            </tr>
                                        ))}
                                    </DataTable>
                                    {(mappingPreview?.length ?? 0) > 20 && (
                                        <p className="text-xs text-muted-foreground">
                                            Showing the first 20 of {mappingPreview?.length} resolved rows.
                                        </p>
                                    )}
                                    <div className={`rounded-lg border p-3 text-xs ${invalidProductSupplierRows.length > 0 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
                                        <p className="font-semibold">
                                            Preflight: {mappingPreview?.length ?? 0} rows · {(mappingPreview?.length ?? 0) - invalidProductSupplierRows.length} valid · {invalidProductSupplierRows.length} invalid · {pct(((mappingPreview?.length ?? 0) - invalidProductSupplierRows.length) / Math.max(1, mappingPreview?.length ?? 0) * 100)} quality
                                        </p>
                                        {invalidProductSupplierRows.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                {invalidProductSupplierRows.flatMap((item) =>
                                                    item.errors.map((message, index) => (
                                                        <p key={`${item.row}-${index}`}>Row {item.row}: {message}</p>
                                                    )),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Panel>
                    )}

                    {/* STEP 4: PERSISTED IMPORT RESULT */}
                    {step === 4 && (
                        <Panel
                            title={lastImport?.status === "FAILED" ? "Import Failed" : lastImport?.status === "PARTIAL" ? "Import Partially Completed" : "Import Complete"}
                            description="Result recorded in the current workspace import history."
                        >
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className={`flex size-14 items-center justify-center rounded-full mb-4 ${lastImport?.status === "FAILED" ? "bg-rose-100 text-rose-700" : lastImport?.status === "PARTIAL" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-600"}`}>
                                    {lastImport?.status === "FAILED" || lastImport?.status === "PARTIAL" ? <AlertTriangle className="size-8" /> : <CheckCircle2 className="size-8" />}
                                </div>
                                <h3 className="text-xl font-bold text-foreground">
                                    {lastImport?.status === "FAILED" ? "No rows were imported" : lastImport?.status === "PARTIAL" ? "Some rows were not imported" : "Data Ingested Successfully"}
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground max-w-md">
                                    {lastImport?.validCount ?? 0} rows persisted; {lastImport?.errorCount ?? 0} row errors. Quality score: {lastImport?.qualityScore ?? 0}%.
                                </p>
                                {!!lastImport?.rowErrors.length && (
                                    <div className="mt-5 w-full max-w-3xl space-y-2 text-left">
                                        {lastImport.rowErrors.map((error, index) => (
                                            <div key={`${error.row}-${error.stage}-${index}`} className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                                                <p className="font-semibold">Row {error.row} · {error.stage}{error.code ? ` · ${error.code}` : ""}</p>
                                                <p className="mt-1">{error.message}</p>
                                                {error.details && <p className="mt-1">{error.details}</p>}
                                                {error.hint && <p className="mt-1">Hint: {error.hint}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-6 flex gap-3">
                                    <Button
                                        onClick={() => {
                                            setStep(1);
                                            setFile(null);
                                        }}
                                        variant="outline"
                                    >
                                        Import Another File
                                    </Button>
                                </div>
                            </div>
                        </Panel>
                    )}
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                    <Panel title="Import History & Audit Log" description="Log of all dataset ingestions performed across your workspace">
                        <DataTable headers={["Filename", "Dataset", "Total Rows", "Valid Rows", "Quality Score", "Status", "Imported At", "User", "Row Errors"]}>
                            {history.map((h) => (
                                <tr key={h.id} className="border-t border-border/60">
                                    <td className="px-3.5 py-3 font-semibold text-foreground">{h.filename}</td>
                                    <td className="px-3.5 py-3 text-xs uppercase text-muted-foreground">{h.dataset}</td>
                                    <td className="num px-3.5 py-3">{num(h.rowCount)}</td>
                                    <td className="num px-3.5 py-3 text-emerald-700 font-medium">{num(h.validCount)}</td>
                                    <td className="num px-3.5 py-3 font-bold text-primary">{pct(h.qualityScore)}</td>
                                    <td className="px-3.5 py-3">
                                        <StatusPill value={h.status} />
                                    </td>
                                    <td className="num px-3.5 py-3 text-xs text-muted-foreground">{dateLabel(h.importedAt)}</td>
                                    <td className="px-3.5 py-3 text-xs text-muted-foreground">{h.importedBy}</td>
                                    <td className="px-3.5 py-3 text-xs text-rose-800">
                                        {historyErrors[h.id]?.length
                                            ? historyErrors[h.id].map((error, index) => (
                                                <p key={`${error.row}-${error.stage}-${index}`}>
                                                    Row {error.row} · {error.stage}{error.code ? ` · ${error.code}` : ""}: {error.message}
                                                </p>
                                            ))
                                            : h.errorCount > 0 ? "Details unavailable for earlier imports" : "—"}
                                    </td>
                                </tr>
                            ))}
                        </DataTable>
                    </Panel>
                    <Panel
                        title="System Event Stream"
                        description="Workspace-scoped domain events audited in PostgreSQL and projected by Kafka consumers."
                        className="mt-6"
                        actions={
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-2 text-xs"
                                disabled={retryEventsMutation.isPending || !eventQuery.data?.some((event) =>
                                    event.processing_status === "PENDING" || event.processing_status === "FAILED",
                                )}
                                onClick={() => retryEventsMutation.mutate()}
                            >
                                <RefreshCw className={`size-3.5 ${retryEventsMutation.isPending ? "animate-spin" : ""}`} />
                                Retry Pending Events
                            </Button>
                        }
                    >
                        {eventQuery.data?.[0] && !eventQuery.data[0].consumerStatusAvailable ? (
                            <div className="mb-3 rounded border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900">
                                Kafka consumer status is unavailable; displayed status reflects PostgreSQL event delivery state only.
                            </div>
                        ) : null}
                        {eventQuery.isError ? (
                            <div role="alert" className="rounded border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900">
                                Event history is unavailable: {eventQuery.error.message}. Apply the domain-events database migration and ensure Kafka is configured.
                            </div>
                        ) : eventQuery.isLoading ? (
                            <p className="text-xs text-muted-foreground">Loading workspace event history…</p>
                        ) : eventQuery.data?.length ? (
                            <DataTable headers={["Event Type", "Entity", "Workspace", "Timestamp", "Processing Status", "Details"]}>
                                {eventQuery.data.map((event) => {
                                    const status = event.consumerStatus?.status ?? event.processing_status;
                                    return (
                                        <tr key={event.event_id} className="border-t border-border/60">
                                            <td className="px-3.5 py-2.5 font-mono text-xs font-semibold text-foreground">{event.event_type}</td>
                                            <td className="px-3.5 py-2.5 text-xs text-muted-foreground">
                                                {event.entity_type}{event.entity_id ? ` · ${event.entity_id.slice(0, 8)}` : ""}
                                            </td>
                                            <td className="px-3.5 py-2.5 font-mono text-[10px] text-muted-foreground">{event.workspace_id}</td>
                                            <td className="px-3.5 py-2.5 text-xs text-muted-foreground">{dateLabel(event.created_at)}</td>
                                            <td className="px-3.5 py-2.5"><StatusPill value={status} /></td>
                                            <td className="px-3.5 py-2.5 max-w-sm truncate text-xs text-muted-foreground">
                                                {event.consumerStatus?.error ?? event.error_message ?? event.consumerStatus?.processedAt ?? event.published_at ?? "Awaiting Kafka delivery"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </DataTable>
                        ) : (
                            <p className="text-xs text-muted-foreground">No domain events have been recorded for this workspace yet.</p>
                        )}
                    </Panel>
                </TabsContent>
            </Tabs>
        </>
    );
}
