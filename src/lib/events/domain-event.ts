import type { Database, Json } from "@/integrations/supabase/types";

export const DOMAIN_EVENT_TYPES = [
  "inventory.updated",
  "purchase_order.created",
  "purchase_order.approved",
  "purchase_order.received",
  "shipment.created",
  "shipment.updated",
  "shipment.delayed",
  "shipment.delivered",
  "alert.created",
  "alert.acknowledged",
  "recommendation.approved",
  "dataset.imported",
  "forecast.generated",
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export type DomainEvent = {
  event_id: string;
  event_type: DomainEventType;
  timestamp: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string | null;
  payload: Json;
  source: string;
};

export type DomainEventInput = {
  workspaceId: string;
  eventType: DomainEventType;
  entityType: string;
  entityId?: string | null;
  payload: Json;
};

export type DomainEventRow = Database["public"]["Tables"]["domain_events"]["Row"];

export type ConsumerEventStatus = {
  status: "PROCESSED" | "FAILED";
  processedAt?: string;
  error?: string;
};

export function toDomainEvent(row: DomainEventRow): DomainEvent {
  return {
    event_id: row.event_id,
    event_type: row.event_type as DomainEventType,
    timestamp: row.created_at,
    workspace_id: row.workspace_id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    payload: row.payload,
    source: row.source,
  };
}
