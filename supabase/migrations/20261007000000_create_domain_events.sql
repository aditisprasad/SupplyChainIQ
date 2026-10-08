CREATE TABLE public.domain_events (
  event_id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'supplychainiq',
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  processing_status text NOT NULL DEFAULT 'PENDING'
    CHECK (processing_status IN ('PENDING', 'PUBLISHED', 'FAILED')),
  error_message text
);

CREATE INDEX domain_events_workspace_created_idx
  ON public.domain_events (workspace_id, created_at DESC);
CREATE INDEX domain_events_pending_idx
  ON public.domain_events (workspace_id, processing_status, created_at)
  WHERE processing_status IN ('PENDING', 'FAILED');

GRANT SELECT, INSERT, UPDATE ON public.domain_events TO authenticated;
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY domain_events_select
  ON public.domain_events FOR SELECT TO authenticated
  USING (public.can_access_workspace(workspace_id));
CREATE POLICY domain_events_insert
  ON public.domain_events FOR INSERT TO authenticated
  WITH CHECK (public.can_write_workspace(workspace_id));
CREATE POLICY domain_events_update
  ON public.domain_events FOR UPDATE TO authenticated
  USING (public.can_write_workspace(workspace_id))
  WITH CHECK (public.can_write_workspace(workspace_id));

CREATE OR REPLACE FUNCTION public.capture_supplychain_domain_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  event_type text;
  event_workspace_id uuid;
  event_entity_id uuid;
  event_entity_type text := TG_TABLE_NAME;
  event_payload jsonb;
BEGIN
  event_workspace_id := NEW.workspace_id;
  event_entity_id := NEW.id;
  event_payload := to_jsonb(NEW) - 'workspace_id';

  CASE TG_TABLE_NAME
    WHEN 'inventory_positions' THEN
      event_type := 'inventory.updated';
      event_payload := jsonb_build_object(
        'product_id', NEW.product_id,
        'site_id', NEW.site_id,
        'on_hand_units', NEW.on_hand_units,
        'on_order_units', NEW.on_order_units,
        'safety_stock_units', NEW.safety_stock_units,
        'reorder_point_units', NEW.reorder_point_units
      );
    WHEN 'purchase_orders' THEN
      IF TG_OP = 'INSERT' THEN
        event_type := 'purchase_order.created';
      ELSIF NEW.status = 'APPROVED' AND OLD.status IS DISTINCT FROM NEW.status THEN
        event_type := 'purchase_order.approved';
      ELSIF NEW.status = 'RECEIVED' AND OLD.status IS DISTINCT FROM NEW.status THEN
        event_type := 'purchase_order.received';
      ELSE
        RETURN NEW;
      END IF;
      event_payload := jsonb_build_object(
        'po_number', NEW.po_number,
        'status', NEW.status,
        'supplier_id', NEW.supplier_id,
        'site_id', NEW.site_id,
        'total_value_usd', NEW.total_value_usd
      );
    WHEN 'shipments' THEN
      IF TG_OP = 'INSERT' THEN
        event_type := 'shipment.created';
      ELSIF NEW.status = 'DELAYED' AND OLD.status IS DISTINCT FROM NEW.status THEN
        event_type := 'shipment.delayed';
      ELSIF NEW.status = 'DELIVERED' AND OLD.status IS DISTINCT FROM NEW.status THEN
        event_type := 'shipment.delivered';
      ELSE
        event_type := 'shipment.updated';
      END IF;
      event_payload := jsonb_build_object(
        'shipment_ref', NEW.shipment_ref,
        'status', NEW.status,
        'lane', NEW.lane,
        'units', NEW.units,
        'eta_date', NEW.eta_date
      );
    WHEN 'alerts' THEN
      IF TG_OP = 'INSERT' THEN
        event_type := 'alert.created';
      ELSIF NEW.status = 'ACKNOWLEDGED' AND OLD.status IS DISTINCT FROM NEW.status THEN
        event_type := 'alert.acknowledged';
      ELSE
        RETURN NEW;
      END IF;
      event_payload := jsonb_build_object(
        'module', NEW.module,
        'severity', NEW.severity,
        'status', NEW.status,
        'title', NEW.title,
        'impact_usd', NEW.impact_usd
      );
    WHEN 'demand_forecasts' THEN
      IF NEW.actual_units IS NULL THEN
        event_type := 'forecast.generated';
      ELSE
        RETURN NEW;
      END IF;
      event_payload := jsonb_build_object(
        'product_id', NEW.product_id,
        'site_id', NEW.site_id,
        'period_month', NEW.period_month,
        'forecast_units', NEW.forecast_units,
        'model', NEW.model
      );
    WHEN 'data_imports' THEN
      IF NEW.status IN ('COMPLETED', 'PARTIAL') AND OLD.status IS DISTINCT FROM NEW.status
        AND NEW.valid_count > 0 THEN
        event_type := 'dataset.imported';
      ELSE
        RETURN NEW;
      END IF;
      event_payload := jsonb_build_object(
        'dataset', NEW.dataset,
        'status', NEW.status,
        'row_count', NEW.row_count,
        'valid_count', NEW.valid_count,
        'error_count', NEW.error_count,
        'quality_score', NEW.quality_score
      );
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.domain_events (
    event_id, workspace_id, event_type, entity_type, entity_id, payload, source
  ) VALUES (
    gen_random_uuid(),
    event_workspace_id,
    event_type,
    event_entity_type,
    event_entity_id,
    event_payload,
    'postgres_trigger'
  );

  IF TG_TABLE_NAME = 'purchase_orders'
    AND TG_OP = 'INSERT'
    AND NEW.status = 'APPROVED' THEN
    INSERT INTO public.domain_events (
      event_id, workspace_id, event_type, entity_type, entity_id, payload, source
    ) VALUES (
      gen_random_uuid(),
      event_workspace_id,
      'purchase_order.approved',
      event_entity_type,
      event_entity_id,
      event_payload,
      'postgres_trigger'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_positions_domain_event
  AFTER INSERT OR UPDATE ON public.inventory_positions
  FOR EACH ROW EXECUTE FUNCTION public.capture_supplychain_domain_event();
CREATE TRIGGER purchase_orders_domain_event
  AFTER INSERT OR UPDATE OF status ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.capture_supplychain_domain_event();
CREATE TRIGGER shipments_domain_event
  AFTER INSERT OR UPDATE OF status ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.capture_supplychain_domain_event();
CREATE TRIGGER alerts_domain_event
  AFTER INSERT OR UPDATE OF status ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.capture_supplychain_domain_event();
CREATE TRIGGER demand_forecasts_domain_event
  AFTER INSERT OR UPDATE ON public.demand_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.capture_supplychain_domain_event();
CREATE TRIGGER data_imports_domain_event
  AFTER UPDATE OF status ON public.data_imports
  FOR EACH ROW EXECUTE FUNCTION public.capture_supplychain_domain_event();
