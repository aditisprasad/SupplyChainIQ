import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { DomainEventInput, DomainEventRow } from "@/lib/events/domain-event";
import { toDomainEvent } from "@/lib/events/domain-event";
import { DOMAIN_EVENTS_TOPIC, getKafka } from "./config.server";
import type { Producer } from "kafkajs";

type Db = SupabaseClient<Database>;
type DomainEventInsert = Database["public"]["Tables"]["domain_events"]["Insert"];
let sharedProducer: Producer | undefined;
let producerConnection: Promise<void> | undefined;

async function getConnectedProducer() {
  const kafka = getKafka();
  if (!kafka) return null;
  sharedProducer ??= kafka.producer({ allowAutoTopicCreation: false, idempotent: true });
  if (!producerConnection) {
    producerConnection = sharedProducer.connect().catch((error: unknown) => {
      producerConnection = undefined;
      throw error;
    });
  }
  await producerConnection;
  return sharedProducer;
}

async function setDeliveryStatus(
  db: Db,
  events: Array<Pick<DomainEventRow, "event_id" | "workspace_id">>,
  status: "PENDING" | "PUBLISHED" | "FAILED",
  errorMessage: string | null,
  publishedAt: string | null = null,
) {
  if (events.length === 0) return;
  const workspaceIds = new Set(events.map((event) => event.workspace_id));
  if (workspaceIds.size !== 1) {
    console.error("[domain-events] Cannot update events from multiple workspaces together", {
      eventIds: events.map((event) => event.event_id),
    });
    return;
  }
  const { error } = await db
    .from("domain_events")
    .update({
      processing_status: status,
      error_message: errorMessage,
      published_at: publishedAt,
    })
    .in("event_id", events.map((event) => event.event_id))
    .eq("workspace_id", events[0].workspace_id);
  if (error) {
    console.error("[domain-events] Unable to update event delivery status", {
      eventIds: events.map((event) => event.event_id),
      workspaceId: events[0].workspace_id,
      status,
      message: error.message,
    });
  }
}

async function publishStoredEvents(db: Db, rows: DomainEventRow[]) {
  if (rows.length === 0) return;
  const events = rows.map(({ event_id, workspace_id }) => ({ event_id, workspace_id }));
  if (!process.env.KAFKA_BROKERS?.trim()) {
    const message = "KAFKA_BROKERS is not configured; event remains pending.";
    await setDeliveryStatus(db, events, "PENDING", message);
    console.warn("[domain-events] Kafka is not configured", {
      eventIds: rows.map((row) => row.event_id),
      workspaceId: rows[0].workspace_id,
    });
    return;
  }

  try {
    const producer = await getConnectedProducer();
    if (!producer) return;
    await producer.send({
      topic: DOMAIN_EVENTS_TOPIC,
      acks: -1,
      messages: rows.map((row) => ({
        key: `${row.workspace_id}:${row.entity_type}:${row.entity_id ?? row.event_id}`,
        value: JSON.stringify(toDomainEvent(row)),
        headers: {
          event_id: row.event_id,
          workspace_id: row.workspace_id,
          event_type: row.event_type,
        },
      })),
    });
    await setDeliveryStatus(db, events, "PUBLISHED", null, new Date().toISOString());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[domain-events] Kafka publish failed; event retained for retry", {
      eventIds: rows.map((row) => row.event_id),
      workspaceId: rows[0].workspace_id,
      message,
    });
    await setDeliveryStatus(db, events, "FAILED", message);
  }
}

export async function recordDomainEvents(db: Db, inputs: DomainEventInput[]) {
  if (inputs.length === 0) return;
  const workspaceId = inputs[0].workspaceId;
  if (inputs.some((input) => input.workspaceId !== workspaceId)) {
    console.error("[domain-events] Refusing to batch events from different workspaces", {
      workspaceIds: [...new Set(inputs.map((input) => input.workspaceId))],
    });
    return [] as DomainEventRow[];
  }
  const newEvents: DomainEventInsert[] = inputs.map((input) => ({
    event_id: randomUUID(),
    workspace_id: input.workspaceId,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    payload: input.payload,
    source: "supplychainiq",
    processing_status: "PENDING",
  }));
  const insertedRows: DomainEventRow[] = [];
  for (let offset = 0; offset < newEvents.length; offset += 250) {
    const { data, error } = await db
      .from("domain_events")
      .insert(newEvents.slice(offset, offset + 250))
      .select("*");
    if (error || !data || data.length !== newEvents.slice(offset, offset + 250).length) {
      console.error("[domain-events] Event audit insert failed after business action", {
        workspaceId,
        eventTypes: inputs.slice(offset, offset + 250).map((input) => input.eventType),
        message: error?.message ?? "No event rows returned",
      });
      continue;
    }
    insertedRows.push(...data);
  }
  return insertedRows;
}

export async function emitDomainEvents(db: Db, inputs: DomainEventInput[]) {
  const insertedRows = await recordDomainEvents(db, inputs);
  for (let offset = 0; offset < insertedRows.length; offset += 500) {
    await publishStoredEvents(db, insertedRows.slice(offset, offset + 500));
  }
}

export async function emitDomainEvent(db: Db, input: DomainEventInput) {
  await emitDomainEvents(db, [input]);
}

export async function retryPendingDomainEvents(db: Db, workspaceId: string) {
  const { data, error } = await db
    .from("domain_events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("processing_status", ["PENDING", "FAILED"])
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw new Error(`Pending event lookup failed: ${error.message}`);

  const rows = data ?? [];
  for (let offset = 0; offset < rows.length; offset += 500) {
    await publishStoredEvents(db, rows.slice(offset, offset + 500));
  }
  return { attempted: rows.length };
}
