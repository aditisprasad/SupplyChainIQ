SELECT setseed(0.4242);

INSERT INTO public.workspaces (id, name, slug, industry, currency, is_demo)
VALUES ('11111111-1111-4111-8111-111111111111','Northwind Electronics (Demo)','northwind-demo','Consumer Electronics Manufacturing','USD',true);

INSERT INTO public.sites (workspace_id, code, name, site_type, city, country, region) VALUES
('11111111-1111-4111-8111-111111111111','PLT-SZX','Shenzhen Assembly Plant','PLANT','Shenzhen','China','APAC'),
('11111111-1111-4111-8111-111111111111','PLT-GDL','Guadalajara Assembly Plant','PLANT','Guadalajara','Mexico','LATAM'),
('11111111-1111-4111-8111-111111111111','DC-FRE','Fremont Distribution Center','DISTRIBUTION_CENTER','Fremont','United States','NA'),
('11111111-1111-4111-8111-111111111111','DC-RTM','Rotterdam Distribution Center','DISTRIBUTION_CENTER','Rotterdam','Netherlands','EMEA'),
('11111111-1111-4111-8111-111111111111','DC-SIN','Singapore Distribution Center','DISTRIBUTION_CENTER','Singapore','Singapore','APAC'),
('11111111-1111-4111-8111-111111111111','DC-GRU','Sao Paulo Distribution Center','DISTRIBUTION_CENTER','Sao Paulo','Brazil','LATAM');

INSERT INTO public.suppliers (workspace_id, code, name, category, tier, country, region, lead_time_days, on_time_delivery_rate, defect_rate_ppm, financial_risk_score, geopolitical_risk_score, capacity_risk_score, status, annual_spend_usd, contract_expiry) VALUES
('11111111-1111-4111-8111-111111111111','SUP-1001','Fujian Precision Optics','Display Modules',1,'China','APAC',42,91.40,820,38.00,64.00,45.00,'ACTIVE',18420000,'2027-03-31'),
('11111111-1111-4111-8111-111111111111','SUP-1002','Hanyang Semiconductor','Semiconductors',1,'South Korea','APAC',56,96.80,140,18.00,28.00,52.00,'ACTIVE',31250000,'2026-12-31'),
('11111111-1111-4111-8111-111111111111','SUP-1003','Taipei MicroCircuits','PCB Assemblies',1,'Taiwan','APAC',35,94.20,310,22.00,71.00,38.00,'ACTIVE',22780000,'2026-09-30'),
('11111111-1111-4111-8111-111111111111','SUP-1004','Voltaic Cell Industries','Battery Cells',1,'China','APAC',48,88.10,1250,55.00,64.00,68.00,'AT_RISK',14960000,'2026-10-31'),
('11111111-1111-4111-8111-111111111111','SUP-1005','Rheinmetall Enclosures','Enclosures',2,'Germany','EMEA',28,98.30,90,12.00,14.00,26.00,'ACTIVE',9840000,'2028-01-31'),
('11111111-1111-4111-8111-111111111111','SUP-1006','Penang Connector Works','Connectors',2,'Malaysia','APAC',31,93.70,480,29.00,32.00,41.00,'ACTIVE',6720000,'2027-06-30'),
('11111111-1111-4111-8111-111111111111','SUP-1007','Monterrey Plastics Group','Plastic Housings',2,'Mexico','LATAM',18,95.60,620,34.00,25.00,33.00,'ACTIVE',5210000,'2026-11-30'),
('11111111-1111-4111-8111-111111111111','SUP-1008','Osaka Acoustics','Speakers & Mics',1,'Japan','APAC',39,97.50,180,15.00,12.00,29.00,'ACTIVE',11340000,'2027-08-31'),
('11111111-1111-4111-8111-111111111111','SUP-1009','Bengaluru Cable Systems','Cables & Harness',2,'India','APAC',33,89.90,940,41.00,38.00,47.00,'ACTIVE',4180000,'2026-08-31'),
('11111111-1111-4111-8111-111111111111','SUP-1010','Nordic Power Modules','Power Adapters',1,'Sweden','EMEA',26,97.90,120,11.00,10.00,22.00,'ACTIVE',8930000,'2028-04-30'),
('11111111-1111-4111-8111-111111111111','SUP-1011','Shenzhen Camera Optics','Camera Modules',1,'China','APAC',45,85.30,1580,62.00,64.00,74.00,'AT_RISK',12470000,'2026-07-31'),
('11111111-1111-4111-8111-111111111111','SUP-1012','Portland Sensor Labs','Sensors',1,'United States','NA',22,99.10,70,9.00,8.00,19.00,'ACTIVE',7650000,'2029-02-28');

INSERT INTO public.products (workspace_id, sku, name, category, unit_cost, unit_price, abc_class, lifecycle_stage) VALUES
('11111111-1111-4111-8111-111111111111','NW-PHN-14P','Aurora 14 Pro Smartphone','Smartphones',412.00,999.00,'A','MATURE'),
('11111111-1111-4111-8111-111111111111','NW-PHN-14','Aurora 14 Smartphone','Smartphones',318.00,749.00,'A','MATURE'),
('11111111-1111-4111-8111-111111111111','NW-PHN-13','Aurora 13 Smartphone','Smartphones',264.00,599.00,'B','DECLINE'),
('11111111-1111-4111-8111-111111111111','NW-TAB-11','Slate 11 Tablet','Tablets',238.00,549.00,'A','GROWTH'),
('11111111-1111-4111-8111-111111111111','NW-TAB-13','Slate 13 Pro Tablet','Tablets',344.00,799.00,'B','GROWTH'),
('11111111-1111-4111-8111-111111111111','NW-LAP-15','Meridian 15 Laptop','Laptops',612.00,1299.00,'A','MATURE'),
('11111111-1111-4111-8111-111111111111','NW-LAP-14U','Meridian 14 Ultra Laptop','Laptops',848.00,1799.00,'A','GROWTH'),
('11111111-1111-4111-8111-111111111111','NW-WCH-S3','Pulse Watch S3','Wearables',96.00,249.00,'B','MATURE'),
('11111111-1111-4111-8111-111111111111','NW-WCH-A2','Pulse Watch Active 2','Wearables',68.00,179.00,'B','GROWTH'),
('11111111-1111-4111-8111-111111111111','NW-BUD-P2','Echo Buds Pro 2','Audio',44.00,149.00,'A','MATURE'),
('11111111-1111-4111-8111-111111111111','NW-BUD-L1','Echo Buds Lite','Audio',22.00,69.00,'C','MATURE'),
('11111111-1111-4111-8111-111111111111','NW-HPN-X1','Echo Headphones X1','Audio',112.00,299.00,'B','GROWTH'),
('11111111-1111-4111-8111-111111111111','NW-MON-27','Vista 27 Monitor','Displays',178.00,399.00,'B','MATURE'),
('11111111-1111-4111-8111-111111111111','NW-MON-32','Vista 32 4K Monitor','Displays',286.00,649.00,'B','GROWTH'),
('11111111-1111-4111-8111-111111111111','NW-CAM-D4','Lumen Doorbell Cam D4','Smart Home',52.00,129.00,'C','GROWTH'),
('11111111-1111-4111-8111-111111111111','NW-HUB-S1','Lumen Smart Hub S1','Smart Home',38.00,99.00,'C','INTRO'),
('11111111-1111-4111-8111-111111111111','NW-CHG-65','Volt 65W Charger','Accessories',14.00,49.00,'C','MATURE'),
('11111111-1111-4111-8111-111111111111','NW-KBD-M1','Meridian Keyboard M1','Accessories',26.00,89.00,'C','MATURE');

-- sourcing links: primary + secondary supplier per product
WITH p AS (
  SELECT id, workspace_id, unit_cost, row_number() OVER (ORDER BY sku) AS rn
  FROM public.products WHERE workspace_id = '11111111-1111-4111-8111-111111111111'
), s AS (
  SELECT id, lead_time_days, row_number() OVER (ORDER BY code) AS rn
  FROM public.suppliers WHERE workspace_id = '11111111-1111-4111-8111-111111111111'
)
INSERT INTO public.product_suppliers (workspace_id, product_id, supplier_id, is_primary, unit_cost, lead_time_days, moq)
SELECT p.workspace_id, p.id, s.id, true, round(p.unit_cost * 0.62, 2), s.lead_time_days, 500
FROM p JOIN s ON s.rn = ((p.rn - 1) % 12) + 1;

WITH p AS (
  SELECT id, workspace_id, unit_cost, row_number() OVER (ORDER BY sku) AS rn
  FROM public.products WHERE workspace_id = '11111111-1111-4111-8111-111111111111'
), s AS (
  SELECT id, lead_time_days, row_number() OVER (ORDER BY code) AS rn
  FROM public.suppliers WHERE workspace_id = '11111111-1111-4111-8111-111111111111'
)
INSERT INTO public.product_suppliers (workspace_id, product_id, supplier_id, is_primary, unit_cost, lead_time_days, moq)
SELECT p.workspace_id, p.id, s.id, false, round(p.unit_cost * 0.68, 2), s.lead_time_days + 6, 1000
FROM p JOIN s ON s.rn = ((p.rn + 3) % 12) + 1
ON CONFLICT DO NOTHING;

-- 24 months of demand history across the four distribution centers
INSERT INTO public.demand_history (workspace_id, product_id, site_id, period_month, units, revenue_usd)
SELECT
  p.workspace_id, p.id, s.id, m.period_month,
  GREATEST(20, base.units)::int,
  round(GREATEST(20, base.units) * p.unit_price, 2)
FROM public.products p
JOIN public.sites s ON s.workspace_id = p.workspace_id AND s.site_type = 'DISTRIBUTION_CENTER'
CROSS JOIN (
  SELECT (date_trunc('month', now())::date - (i || ' months')::interval)::date AS period_month, i
  FROM generate_series(1, 24) i
) m
CROSS JOIN LATERAL (
  SELECT (
    (CASE p.abc_class WHEN 'A' THEN 4200 WHEN 'B' THEN 1800 ELSE 700 END)
    * (CASE s.code WHEN 'DC-FRE' THEN 1.0 WHEN 'DC-RTM' THEN 0.72 WHEN 'DC-SIN' THEN 0.55 ELSE 0.31 END)
    * (CASE p.lifecycle_stage
         WHEN 'INTRO' THEN 0.45 + (24 - m.i) * 0.035
         WHEN 'GROWTH' THEN 0.70 + (24 - m.i) * 0.020
         WHEN 'MATURE' THEN 1.0
         ELSE 1.35 - (24 - m.i) * 0.028 END)
    * (1 + 0.22 * sin((extract(month from m.period_month)::numeric + 9) / 12 * 2 * pi()))
    * (0.90 + random() * 0.20)
  )::int AS units
) base
WHERE p.workspace_id = '11111111-1111-4111-8111-111111111111';

-- forecasts: 6 past months (with actuals) + 6 future months
INSERT INTO public.demand_forecasts (workspace_id, product_id, site_id, period_month, model, forecast_units, lower_bound_units, upper_bound_units, actual_units)
SELECT
  d.workspace_id, d.product_id, d.site_id, d.period_month, 'HOLT_WINTERS',
  f.fc, GREATEST(0, (f.fc * 0.86)::int), (f.fc * 1.15)::int, d.units
FROM public.demand_history d
CROSS JOIN LATERAL (SELECT GREATEST(10, (d.units * (0.88 + random() * 0.26))::int) AS fc) f
WHERE d.workspace_id = '11111111-1111-4111-8111-111111111111'
  AND d.period_month >= (date_trunc('month', now())::date - interval '6 months');

INSERT INTO public.demand_forecasts (workspace_id, product_id, site_id, period_month, model, forecast_units, lower_bound_units, upper_bound_units, actual_units)
SELECT
  base.workspace_id, base.product_id, base.site_id, fut.period_month, 'HOLT_WINTERS',
  f.fc, GREATEST(0,(f.fc * 0.82)::int), (f.fc * 1.19)::int, NULL
FROM (
  SELECT workspace_id, product_id, site_id, avg(units) AS avg_units
  FROM public.demand_history
  WHERE workspace_id = '11111111-1111-4111-8111-111111111111'
    AND period_month >= (date_trunc('month', now())::date - interval '6 months')
  GROUP BY workspace_id, product_id, site_id
) base
CROSS JOIN (
  SELECT (date_trunc('month', now())::date + (i || ' months')::interval)::date AS period_month, i
  FROM generate_series(0, 5) i
) fut
CROSS JOIN LATERAL (
  SELECT GREATEST(10, (base.avg_units * (1.02 + fut.i * 0.015) * (1 + 0.18 * sin((extract(month from fut.period_month)::numeric + 9) / 12 * 2 * pi())) * (0.95 + random() * 0.1))::int) AS fc
) f;

-- inventory positions derived from recent demand
INSERT INTO public.inventory_positions (workspace_id, product_id, site_id, on_hand_units, on_order_units, allocated_units, safety_stock_units, reorder_point_units, avg_daily_demand)
SELECT
  b.workspace_id, b.product_id, b.site_id,
  GREATEST(0, (b.add * 30 * (0.25 + random() * 1.9))::int),
  (b.add * 30 * (random() * 0.7))::int,
  (b.add * 30 * (0.05 + random() * 0.2))::int,
  (b.add * 14)::int,
  (b.add * 14 + b.add * ps.lead_time_days)::int,
  round(b.add, 2)
FROM (
  SELECT workspace_id, product_id, site_id, avg(units) / 30.0 AS add
  FROM public.demand_history
  WHERE workspace_id = '11111111-1111-4111-8111-111111111111'
    AND period_month >= (date_trunc('month', now())::date - interval '3 months')
  GROUP BY workspace_id, product_id, site_id
) b
JOIN LATERAL (
  SELECT lead_time_days FROM public.product_suppliers ps2
  WHERE ps2.product_id = b.product_id AND ps2.is_primary ORDER BY ps2.id LIMIT 1
) ps ON true;

-- purchase orders (72) with lines
INSERT INTO public.purchase_orders (workspace_id, po_number, supplier_id, site_id, status, order_date, promised_date, received_date, total_value_usd)
SELECT
  '11111111-1111-4111-8111-111111111111',
  'PO-2026-' || lpad(i::text, 4, '0'),
  sup.id, st.id,
  CASE WHEN i % 9 = 0 THEN 'DELAYED' WHEN i % 3 = 0 THEN 'RECEIVED' WHEN i % 3 = 1 THEN 'OPEN' ELSE 'IN_TRANSIT' END,
  (now()::date - ((i * 3) % 150 || ' days')::interval)::date,
  (now()::date - ((i * 3) % 150 || ' days')::interval + (sup.lead_time_days || ' days')::interval)::date,
  CASE WHEN i % 3 = 0 THEN (now()::date - ((i * 3) % 150 || ' days')::interval + ((sup.lead_time_days + (i % 11) - 3) || ' days')::interval)::date ELSE NULL END,
  0
FROM generate_series(1, 72) i
JOIN LATERAL (SELECT id, lead_time_days FROM public.suppliers WHERE workspace_id='11111111-1111-4111-8111-111111111111' ORDER BY md5(code || i::text) LIMIT 1) sup ON true
JOIN LATERAL (SELECT id FROM public.sites WHERE workspace_id='11111111-1111-4111-8111-111111111111' AND site_type='DISTRIBUTION_CENTER' ORDER BY md5(code || i::text) LIMIT 1) st ON true;

INSERT INTO public.purchase_order_lines (workspace_id, purchase_order_id, product_id, quantity_units, unit_cost, received_units)
SELECT po.workspace_id, po.id, pr.id, q.qty, round(pr.unit_cost * 0.65, 2),
  CASE WHEN po.status = 'RECEIVED' THEN q.qty ELSE 0 END
FROM public.purchase_orders po
JOIN LATERAL (
  SELECT id, unit_cost FROM public.products
  WHERE workspace_id = po.workspace_id ORDER BY md5(sku || po.po_number) LIMIT 3
) pr ON true
CROSS JOIN LATERAL (SELECT (400 + (('x' || substr(md5(po.po_number || pr.id::text),1,6))::bit(24)::int % 4200))::int AS qty) q
WHERE po.workspace_id = '11111111-1111-4111-8111-111111111111';

UPDATE public.purchase_orders po
SET total_value_usd = agg.total
FROM (
  SELECT purchase_order_id, sum(quantity_units * unit_cost) AS total
  FROM public.purchase_order_lines GROUP BY purchase_order_id
) agg
WHERE agg.purchase_order_id = po.id;

-- shipments tied to non-open purchase orders
INSERT INTO public.shipments (workspace_id, purchase_order_id, shipment_ref, carrier, mode, origin_location, destination_site_id, lane, status, ship_date, eta_date, actual_arrival_date, units, freight_cost_usd)
SELECT
  po.workspace_id, po.id,
  'SHP-' || substr(po.po_number, 4),
  (ARRAY['Maersk','DHL Global','Kuehne+Nagel','FedEx Freight','Expeditors'])[1 + (('x'||substr(md5(po.po_number),1,4))::bit(16)::int % 5)],
  CASE WHEN sup.region = 'APAC' AND st.region <> 'APAC' THEN (CASE WHEN po.total_value_usd > 900000 THEN 'AIR' ELSE 'OCEAN' END) ELSE 'ROAD' END,
  sup.country || ' - ' || CASE sup.region WHEN 'APAC' THEN 'Yantian Port' WHEN 'EMEA' THEN 'Hamburg Port' WHEN 'LATAM' THEN 'Manzanillo Port' ELSE 'Portland Hub' END,
  st.id,
  sup.region || ' -> ' || st.region,
  CASE po.status WHEN 'RECEIVED' THEN 'DELIVERED' WHEN 'DELAYED' THEN 'DELAYED' ELSE 'IN_TRANSIT' END,
  po.order_date + 4,
  po.promised_date,
  CASE WHEN po.status = 'RECEIVED' THEN po.received_date ELSE NULL END,
  COALESCE(lines.units, 0),
  round(COALESCE(lines.units, 0) * (CASE WHEN sup.region = 'APAC' THEN 1.9 ELSE 0.8 END) + 4200, 2)
FROM public.purchase_orders po
JOIN public.suppliers sup ON sup.id = po.supplier_id
JOIN public.sites st ON st.id = po.site_id
LEFT JOIN (SELECT purchase_order_id, sum(quantity_units) units FROM public.purchase_order_lines GROUP BY purchase_order_id) lines
  ON lines.purchase_order_id = po.id
WHERE po.workspace_id = '11111111-1111-4111-8111-111111111111'
  AND po.status <> 'OPEN';

UPDATE public.shipments SET eta_date = eta_date + ((7 + (('x'||substr(md5(shipment_ref),1,4))::bit(16)::int % 18)) || ' days')::interval
WHERE status = 'DELAYED';

-- alerts derived from the seeded operational state
INSERT INTO public.alerts (workspace_id, module, severity, title, detail, entity_type, entity_id, status, impact_usd)
SELECT ip.workspace_id, 'INVENTORY',
  CASE WHEN ip.on_hand_units < ip.safety_stock_units THEN 'CRITICAL' ELSE 'HIGH' END,
  'Stockout risk: ' || pr.sku || ' at ' || st.code,
  'On hand ' || ip.on_hand_units || ' units vs reorder point ' || ip.reorder_point_units || ' units. Cover: ' ||
    round(ip.on_hand_units / GREATEST(ip.avg_daily_demand, 0.1), 1) || ' days.',
  'inventory_position', ip.id, 'OPEN',
  round((ip.reorder_point_units - ip.on_hand_units) * pr.unit_price * 0.35, 2)
FROM public.inventory_positions ip
JOIN public.products pr ON pr.id = ip.product_id
JOIN public.sites st ON st.id = ip.site_id
WHERE ip.workspace_id = '11111111-1111-4111-8111-111111111111'
  AND ip.on_hand_units < ip.reorder_point_units
ORDER BY (ip.reorder_point_units - ip.on_hand_units) DESC
LIMIT 14;

INSERT INTO public.alerts (workspace_id, module, severity, title, detail, entity_type, entity_id, status, impact_usd)
SELECT s.workspace_id, 'SUPPLIER',
  CASE WHEN s.on_time_delivery_rate < 88 THEN 'CRITICAL' ELSE 'HIGH' END,
  'Supplier performance breach: ' || s.name,
  'On-time delivery ' || s.on_time_delivery_rate || '% against a 95% target, defect rate ' || s.defect_rate_ppm || ' PPM.',
  'supplier', s.id, 'OPEN', round(s.annual_spend_usd * 0.04, 2)
FROM public.suppliers s
WHERE s.workspace_id = '11111111-1111-4111-8111-111111111111' AND s.on_time_delivery_rate < 92;

INSERT INTO public.alerts (workspace_id, module, severity, title, detail, entity_type, entity_id, status, impact_usd)
SELECT sh.workspace_id, 'LOGISTICS', 'HIGH',
  'Shipment delayed: ' || sh.shipment_ref || ' on ' || sh.lane,
  'ETA slipped to ' || sh.eta_date || ' for ' || sh.units || ' units via ' || sh.carrier || ' (' || sh.mode || ').',
  'shipment', sh.id, 'OPEN', round(sh.freight_cost_usd * 0.5, 2)
FROM public.shipments sh
WHERE sh.workspace_id = '11111111-1111-4111-8111-111111111111' AND sh.status = 'DELAYED';

INSERT INTO public.alerts (workspace_id, module, severity, title, detail, entity_type, entity_id, status, impact_usd)
SELECT f.workspace_id, 'FORECAST', 'MEDIUM',
  'Forecast accuracy below target: ' || pr.sku,
  'Mean absolute percentage error of ' || round(f.mape, 1) || '% over the last six months against a 15% target.',
  'product', f.product_id, 'OPEN', round(f.mape * pr.unit_price * 60, 2)
FROM (
  SELECT workspace_id, product_id,
         avg(abs(forecast_units - actual_units)::numeric / GREATEST(actual_units, 1)) * 100 AS mape
  FROM public.demand_forecasts
  WHERE workspace_id = '11111111-1111-4111-8111-111111111111' AND actual_units IS NOT NULL
  GROUP BY workspace_id, product_id
) f
JOIN public.products pr ON pr.id = f.product_id
WHERE f.mape > 15
ORDER BY f.mape DESC
LIMIT 8;