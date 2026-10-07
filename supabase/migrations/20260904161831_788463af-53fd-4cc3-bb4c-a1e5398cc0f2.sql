-- ============ ROLES & PROFILES ============
CREATE TYPE public.app_role AS ENUM (
  'ADMIN','PROCUREMENT_MANAGER','SUPPLY_CHAIN_MANAGER','BUSINESS_ANALYST','FINANCE_MANAGER','EXECUTIVE'
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  job_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'ADMIN')) WITH CHECK (public.has_role(auth.uid(), 'ADMIN'));

-- ============ WORKSPACES ============
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  industry text NOT NULL DEFAULT 'Consumer Electronics Manufacturing',
  currency text NOT NULL DEFAULT 'USD',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
GRANT SELECT, INSERT ON public.workspace_members TO authenticated;
GRANT ALL ON public.workspace_members TO service_role;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_workspace(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = _workspace_id
      AND (w.is_demo OR EXISTS (
        SELECT 1 FROM public.workspace_members m
        WHERE m.workspace_id = w.id AND m.user_id = auth.uid()
      ))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_write_workspace(_workspace_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_access_workspace(_workspace_id)
     AND public.has_any_role(auth.uid(), ARRAY['ADMIN','SUPPLY_CHAIN_MANAGER','PROCUREMENT_MANAGER']::public.app_role[])
$$;

CREATE POLICY "workspaces_select_accessible" ON public.workspaces FOR SELECT TO authenticated
  USING (public.can_access_workspace(id));
CREATE POLICY "workspace_members_select" ON public.workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_access_workspace(workspace_id));
CREATE POLICY "workspace_members_join_demo" ON public.workspace_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_workspace(workspace_id));

-- ============ MASTER DATA ============
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  site_type text NOT NULL DEFAULT 'DISTRIBUTION_CENTER',
  city text,
  country text NOT NULL,
  region text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, code)
);

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  tier integer NOT NULL DEFAULT 1,
  country text NOT NULL,
  region text NOT NULL,
  lead_time_days integer NOT NULL DEFAULT 30,
  on_time_delivery_rate numeric(5,2) NOT NULL DEFAULT 95,
  defect_rate_ppm integer NOT NULL DEFAULT 500,
  financial_risk_score numeric(5,2) NOT NULL DEFAULT 20,
  geopolitical_risk_score numeric(5,2) NOT NULL DEFAULT 20,
  capacity_risk_score numeric(5,2) NOT NULL DEFAULT 20,
  status text NOT NULL DEFAULT 'ACTIVE',
  annual_spend_usd numeric(14,2) NOT NULL DEFAULT 0,
  contract_expiry date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, code)
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  unit_cost numeric(12,2) NOT NULL,
  unit_price numeric(12,2) NOT NULL,
  abc_class text NOT NULL DEFAULT 'B',
  lifecycle_stage text NOT NULL DEFAULT 'GROWTH',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, sku)
);

CREATE TABLE public.product_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT true,
  unit_cost numeric(12,2) NOT NULL,
  lead_time_days integer NOT NULL DEFAULT 30,
  moq integer NOT NULL DEFAULT 100,
  UNIQUE (product_id, supplier_id)
);

-- ============ OPERATIONAL DATA ============
CREATE TABLE public.inventory_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  on_hand_units integer NOT NULL DEFAULT 0,
  on_order_units integer NOT NULL DEFAULT 0,
  allocated_units integer NOT NULL DEFAULT 0,
  safety_stock_units integer NOT NULL DEFAULT 0,
  reorder_point_units integer NOT NULL DEFAULT 0,
  avg_daily_demand numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, site_id)
);

CREATE TABLE public.demand_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  units integer NOT NULL,
  revenue_usd numeric(14,2) NOT NULL DEFAULT 0,
  UNIQUE (product_id, site_id, period_month)
);

CREATE TABLE public.demand_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  model text NOT NULL DEFAULT 'HOLT_WINTERS',
  forecast_units integer NOT NULL,
  lower_bound_units integer NOT NULL DEFAULT 0,
  upper_bound_units integer NOT NULL DEFAULT 0,
  actual_units integer,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, site_id, period_month, model)
);

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'OPEN',
  order_date date NOT NULL,
  promised_date date NOT NULL,
  received_date date,
  total_value_usd numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, po_number)
);

CREATE TABLE public.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_units integer NOT NULL,
  unit_cost numeric(12,2) NOT NULL,
  received_units integer NOT NULL DEFAULT 0
);

CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  shipment_ref text NOT NULL,
  carrier text NOT NULL,
  mode text NOT NULL DEFAULT 'OCEAN',
  origin_location text NOT NULL,
  destination_site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  lane text NOT NULL,
  status text NOT NULL DEFAULT 'IN_TRANSIT',
  ship_date date NOT NULL,
  eta_date date NOT NULL,
  actual_arrival_date date,
  units integer NOT NULL DEFAULT 0,
  freight_cost_usd numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, shipment_ref)
);

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module text NOT NULL,
  severity text NOT NULL DEFAULT 'MEDIUM',
  title text NOT NULL,
  detail text,
  entity_type text,
  entity_id uuid,
  status text NOT NULL DEFAULT 'OPEN',
  impact_usd numeric(14,2),
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_demand_history_product_period ON public.demand_history (product_id, period_month);
CREATE INDEX idx_forecasts_product_period ON public.demand_forecasts (product_id, period_month);
CREATE INDEX idx_inventory_ws ON public.inventory_positions (workspace_id);
CREATE INDEX idx_shipments_ws_status ON public.shipments (workspace_id, status);
CREATE INDEX idx_po_ws_status ON public.purchase_orders (workspace_id, status);
CREATE INDEX idx_alerts_ws_status ON public.alerts (workspace_id, status);

-- Grants + RLS for all workspace-scoped tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sites','suppliers','products','product_suppliers','inventory_positions',
    'demand_history','demand_forecasts','purchase_orders','purchase_order_lines',
    'shipments','alerts'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.can_access_workspace(workspace_id))', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write_workspace(workspace_id))', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_write_workspace(workspace_id)) WITH CHECK (public.can_write_workspace(workspace_id))', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.can_write_workspace(workspace_id))', t || '_delete', t);
  END LOOP;
END $$;

-- Analysts and executives may acknowledge alerts without full write rights
CREATE POLICY "alerts_acknowledge" ON public.alerts FOR UPDATE TO authenticated
  USING (public.can_access_workspace(workspace_id))
  WITH CHECK (public.can_access_workspace(workspace_id));