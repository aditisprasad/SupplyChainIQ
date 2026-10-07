# SupplyChainIQ — Data Lineage & Database Synchronization Map

This document establishes the end-to-end data lineage for every major business metric displayed within the SupplyChainIQ enterprise SaaS platform. All values are sourced directly from PostgreSQL/Supabase tables or calculated deterministically from persisted records.

---

## 1. Control Tower (Dashboard)

| Displayed Metric | PostgreSQL Table(s) | Server Function / Query | Calculation / Logic | Consuming Pages |
|---|---|---|---|---|
| **Annual Revenue** | `demand_history` | `getOverview()` | `SUM(revenue_usd)` over 12 trailing months | Control Tower, Reports, Scenario Lab |
| **Open PO Value** | `purchase_orders` | `getOverview()` | `SUM(total_value_usd)` WHERE `status != 'RECEIVED'` | Control Tower, Procurement, Reports |
| **Total Inventory Value** | `inventory_positions`, `products` | `getOverview()` | `SUM(on_hand_units × unit_cost)` across all positions | Control Tower, Inventory, Scenario Lab |
| **Freight Spend** | `shipments` | `getOverview()` | `SUM(freight_cost_usd)` for all workspace shipments | Control Tower, Logistics, Scenario Lab |
| **Supplier Count & Risk** | `suppliers` | `getOverview()` | `COUNT(*)` and count where `supplierRiskScore >= 40` | Control Tower, Suppliers, Reports |
| **SKUs at Risk** | `inventory_positions`, `products` | `getOverview()` | Count of SKUs where `on_hand_units < reorder_point_units` | Control Tower, Inventory, Alerts |
| **In-Transit & Delayed Shipments** | `shipments` | `getOverview()` | `COUNT(*)` WHERE status is `IN_TRANSIT` vs `DELAYED` | Control Tower, Logistics, Reports |
| **Forecast Accuracy & Bias** | `demand_forecasts`, `demand_history` | `getOverview()` | MAPE calculation `(1 - avg(|forecast - actual| / actual)) × 100` and `avg((forecast - actual) / actual) × 100` | Control Tower, Demand, Reports |
| **Open & Critical Exceptions** | `alerts` | `getOverview()` | `COUNT(*)` WHERE `status = 'OPEN'`, sub-grouped by `CRITICAL` | Control Tower, Alerts, AI Decision |
| **Exposure at Risk** | `alerts` | `getOverview()` | `SUM(impact_usd)` for open alerts | Control Tower, Alerts, AI Decision |
| **Network Facility Count** | `sites` | `getOverview()` | `COUNT(*)` grouping by site type (`DISTRIBUTION_CENTER`, `PLANT`) | Control Tower, Reports |

---

## 2. Inventory & Stock Health

| Displayed Metric | PostgreSQL Table(s) | Server Function / Query | Calculation / Logic | Consuming Pages |
|---|---|---|---|---|
| **On-Hand Units** | `inventory_positions` | `getInventoryPositions()` | `SUM(on_hand_units)` per position/SKU | Inventory, Control Tower |
| **On-Order Units** | `inventory_positions` | `getInventoryPositions()` | `SUM(on_order_units)` | Inventory, Procurement |
| **Safety Stock & Reorder Point** | `inventory_positions` | `getInventoryPositions()` | `safety_stock_units` and `reorder_point_units` fields | Inventory, Alerts |
| **Average Cover Days** | `inventory_positions` | `getInventoryPositions()` | `on_hand_units / GREATEST(avg_daily_demand, 0.1)` | Inventory, Control Tower |
| **Position Status** | `inventory_positions` | `getInventoryPositions()` | `STOCKOUT` (0), `CRITICAL` (< safety), `REORDER` (< reorder point), `HEALTHY` (normal), `OVERSTOCK` (> 90d cover) | Inventory, Recommendations |
| **Stock Value** | `inventory_positions`, `products` | `getInventoryPositions()` | `on_hand_units × unit_cost` | Inventory, Reports |

---

## 3. Demand Planning & Forecasting

| Displayed Metric | PostgreSQL Table(s) | Server Function / Query | Calculation / Logic | Consuming Pages |
|---|---|---|---|---|
| **Historical Monthly Demand** | `demand_history` | `getDemandHistory()` | Monthly aggregated `units` and `revenue_usd` per SKU/site | Demand, Decision Room |
| **Model Forecast Units** | `demand_forecasts` | `getDemandForecasts()` | `forecast_units`, `lower_bound_units`, `upper_bound_units` | Demand, Decision Room |
| **Forecast Accuracy (MAPE)** | `demand_forecasts` | `getDemandAnalytics()` | `100 - (AVG(|forecast_units - actual_units| / actual_units) × 100)` | Demand, Control Tower |
| **Forecast Bias %** | `demand_forecasts` | `getDemandAnalytics()` | `AVG((forecast_units - actual_units) / actual_units) × 100` | Demand, Control Tower |

---

## 4. Supplier Network

| Displayed Metric | PostgreSQL Table(s) | Server Function / Query | Calculation / Logic | Consuming Pages |
|---|---|---|---|---|
| **On-Time Delivery Rate (OTIF)**| `suppliers` | `getSuppliers()` | `on_time_delivery_rate` percentage | Suppliers, Control Tower |
| **Defect Rate (PPM)** | `suppliers` | `getSuppliers()` | `defect_rate_ppm` parts per million | Suppliers |
| **Supplier Risk Score** | `suppliers` | `getSuppliers()` | `(financial_risk * 0.35) + (geopolitical_risk * 0.35) + (capacity_risk * 0.30)` | Suppliers, Control Tower, AI Decision |
| **Annual Spend Commitment** | `suppliers`, `purchase_orders` | `getSuppliers()` | `SUM(annual_spend_usd)` | Suppliers, Procurement |

---

## 5. Logistics & Telemetry

| Displayed Metric | PostgreSQL Table(s) | Server Function / Query | Calculation / Logic | Consuming Pages |
|---|---|---|---|---|
| **In-Transit / Delayed Shipments** | `shipments` | `getShipments()` | Filtered count of `status` records (`IN_TRANSIT`, `DELAYED`, `DELIVERED`) | Logistics, Control Tower |
| **Carrier Freight Cost** | `shipments` | `getShipments()` | `freight_cost_usd` per shipment record | Logistics, Control Tower |
| **Average Transit Delay** | `shipments` | `getShipments()` | `AVG(actual_arrival_date - eta_date)` for delivered shipments | Logistics, Control Tower |

---

## 6. Procurement & Purchase Orders

| Displayed Metric | PostgreSQL Table(s) | Server Function / Query | Calculation / Logic | Consuming Pages |
|---|---|---|---|---|
| **Open PO Value** | `purchase_orders` | `getPurchaseOrders()` | `SUM(total_value_usd)` for POs where `status != 'RECEIVED'` | Procurement, Control Tower, Reports |
| **Received Value to Date** | `purchase_orders` | `getPurchaseOrders()` | `SUM(total_value_usd)` for POs where `status = 'RECEIVED'` | Procurement, Reports |
| **Past Promised Date (Late POs)**| `purchase_orders` | `getPurchaseOrders()` | `COUNT(*)` WHERE `promised_date < NOW()` AND `status != 'RECEIVED'` | Procurement, Reports |

---

## 7. Decision Room & Recommendations

| Displayed Metric | PostgreSQL Table(s) | Server Function / Query | Calculation / Logic | Consuming Pages |
|---|---|---|---|---|
| **Value at Risk** | `alerts` | `getAiDecisionContext()` | `SUM(impact_usd)` of all open `CRITICAL` & `HIGH` alerts | Decision Room |
| **Grounded Source Records** | `inventory_positions`, `suppliers`, `shipments` | `getAiDecisionContext()` | Exact foreign key lookup of underlying entity records | Decision Room |
| **Replenishment Recommendations**| `inventory_positions`, `demand_history`, `suppliers` | `getRecommendations()` | Evaluates `shortfall = reorder_point - on_hand` against supplier lead time and MOQ | Recommendations |

---

## 8. Business Actions & Database Synchronization

| Action Trigger | Initiating UI Component | Server Function / RPC | Database Mutation | Invalidation Target |
|---|---|---|---|---|
| **Receive PO** | Reports (`/reports`) | `receivePo()` | Updates `purchase_orders.status = 'RECEIVED'`, adds `received_units` to `inventory_positions.on_hand_units` | `['scm']` |
| **Approve Alert** | Alerts (`/alerts`) | `acknowledgeAlert()` | Sets `alerts.status = 'ACKNOWLEDGED'`, `acknowledged_at = NOW()` | `['scm', 'alerts']` |
| **Approve Recommendation** | Recommendations (`/recommendations`) | `approveRecommendation()` | Creates new `purchase_orders` + lines, updates recommendation state | `['scm']` |
| **Execute CSV Ingestion** | Data (`/data`) | `executeDatasetImport()` | Upserts records into `products`, `suppliers`, `inventory_positions`, `demand_history`, `purchase_orders`, `shipments`, logs in `data_imports` | `['scm']` |

### Import Audit Guarantees

- Each submitted import creates one workspace-scoped `data_imports` row in `PROCESSING` before row writes and derives `COMPLETED`, `PARTIAL`, or `FAILED` from fully processed row counts. If the database cannot accept the final audit update, the record can remain `PROCESSING`.
- For non-empty files, `valid_count + error_count` equals `row_count`; an empty file is `FAILED` with zero row errors and a zero quality score.
- Analytics-critical fields are required at the import boundary where database defaults would otherwise imply a real value, including supplier risk inputs, inventory thresholds and demand, demand revenue, purchase-order status/value, and shipment mode/status/units/cost.
- Reference lookup failures are treated as import failures, not as ordinary row validation errors. Import history is refreshed after both success and failure.
