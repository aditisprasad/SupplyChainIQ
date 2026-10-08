import Redis from "ioredis";
import { z } from "zod";
import {
  DOMAIN_EVENTS_DLQ_TOPIC,
  DOMAIN_EVENTS_GROUP,
  DOMAIN_EVENTS_TOPIC,
  getKafka,
} from "./config.server";
import { DOMAIN_EVENT_TYPES, type DomainEvent } from "../events/domain-event";

const eventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: z.enum(DOMAIN_EVENT_TYPES),
  timestamp: z.string().datetime({ offset: true }),
  workspace_id: z.string().uuid(),
  entity_type: z.string().min(1),
  entity_id: z.string().uuid().nullable(),
  payload: z.record(z.string(), z.unknown()),
  source: z.string().min(1),
});

const kafka = getKafka();
if (!kafka) throw new Error("Set KAFKA_BROKERS before starting the SupplyChainIQ event consumer.");
if (!process.env.REDIS_URL) throw new Error("Set REDIS_URL before starting the SupplyChainIQ event consumer.");

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  retryStrategy: (attempt) => Math.min(attempt * 500, 5_000),
});
const consumer = kafka.consumer({
  groupId: DOMAIN_EVENTS_GROUP,
  retry: { retries: 8, initialRetryTime: 500, maxRetryTime: 30_000 },
});
const deadLetterProducer = kafka.producer({ idempotent: true });

function projectionName(eventType: DomainEvent["event_type"]) {
  if (eventType.startsWith("inventory.")) return "inventory";
  if (eventType.startsWith("purchase_order.")) return "procurement";
  if (eventType.startsWith("shipment.")) return "logistics";
  if (eventType.startsWith("alert.") || eventType.startsWith("recommendation.")) return "decisions";
  if (eventType === "dataset.imported") return "ingestion";
  return "demand";
}

async function markFailed(eventId: string | null, workspaceId: string | null, message: string) {
  if (!eventId || !workspaceId) return;
  await redis.set(
    `sciq:event-status:${workspaceId}:${eventId}`,
    JSON.stringify({ status: "FAILED", error: message, processedAt: new Date().toISOString() }),
  );
}

async function sendToDeadLetter(value: string, message: string) {
  await deadLetterProducer.send({
    topic: DOMAIN_EVENTS_DLQ_TOPIC,
    acks: -1,
    messages: [{ value, headers: { failure_message: message, failed_at: new Date().toISOString() } }],
  });
}

async function processMessage(value: string): Promise<DomainEvent> {
  const parsedJson: unknown = JSON.parse(value);
  const event = eventSchema.parse(parsedJson);
  const statusKey = `sciq:event-status:${event.workspace_id}:${event.event_id}`;
  const priorStatus = await redis.get(statusKey);
  if (priorStatus && JSON.parse(priorStatus).status === "PROCESSED") return event;

  const projectionKey =
    `sciq:projection:${event.workspace_id}:${projectionName(event.event_type)}:` +
    `${event.entity_id ?? event.event_id}`;
  const processedAt = new Date().toISOString();
  const projection = JSON.stringify({
    event_id: event.event_id,
    workspace_id: event.workspace_id,
    event_type: event.event_type,
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    timestamp: event.timestamp,
    payload: event.payload,
    source: event.source,
  });

  const results = await redis
    .multi()
    .set(projectionKey, projection, "EX", 60 * 60 * 24 * 30)
    .set(
      statusKey,
      JSON.stringify({ status: "PROCESSED", processedAt }),
      "EX",
      60 * 60 * 24 * 90,
    )
    .exec();
  const redisCommandError = results?.find(([error]) => error)?.[0];
  if (redisCommandError) throw redisCommandError;
  return event;
}

async function commitMessage(topic: string, partition: number, offset: string) {
  await consumer.commitOffsets([
    { topic, partition, offset: (BigInt(offset) + 1n).toString() },
  ]);
}

async function start() {
  await redis.ping();
  await deadLetterProducer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: DOMAIN_EVENTS_TOPIC, fromBeginning: true });
  consumer.on("consumer.crash", ({ payload }) => {
    console.error("[kafka-consumer] Consumer crashed and will retry", {
      message: payload.error.message,
      restart: payload.restart,
    });
  });
  console.info("[kafka-consumer] Connected", {
    groupId: DOMAIN_EVENTS_GROUP,
    topic: DOMAIN_EVENTS_TOPIC,
    projections: ["inventory", "procurement", "logistics", "decisions", "ingestion", "demand"],
  });

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }) => {
      const value = message.value?.toString();
      if (!value) {
        await sendToDeadLetter("", "Event message has no value.");
        await commitMessage(topic, partition, message.offset);
        return;
      }

      try {
        const event = await processMessage(value);
        console.info("[kafka-consumer] Event processed", {
          eventId: event.event_id,
          workspaceId: event.workspace_id,
          eventType: event.event_type,
          entityId: event.entity_id,
        });
        await commitMessage(topic, partition, message.offset);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        const candidate = (() => {
          try {
            return JSON.parse(value) as { event_id?: string; workspace_id?: string };
          } catch {
            return {};
          }
        })();
        const invalidEvent = error instanceof z.ZodError || error instanceof SyntaxError;
        if (!invalidEvent) {
          await markFailed(
            candidate.event_id ?? null,
            candidate.workspace_id ?? null,
            messageText,
          ).catch((statusError: unknown) => {
            console.error("[kafka-consumer] Failed to record projection failure status", {
              eventId: candidate.event_id,
              workspaceId: candidate.workspace_id,
              message: statusError instanceof Error ? statusError.message : String(statusError),
            });
          });
          console.error("[kafka-consumer] Projection failed; offset retained for retry", {
            topic,
            partition,
            offset: message.offset,
            eventId: candidate.event_id,
            workspaceId: candidate.workspace_id,
            message: messageText,
          });
          throw error;
        }

        await sendToDeadLetter(value, messageText);
        await markFailed(candidate.event_id ?? null, candidate.workspace_id ?? null, messageText);
        console.error("[kafka-consumer] Invalid event moved to dead-letter topic", {
          topic,
          partition,
          offset: message.offset,
          eventId: candidate.event_id,
          workspaceId: candidate.workspace_id,
          message: messageText,
        });
        await commitMessage(topic, partition, message.offset);
      }
    },
  });
}

async function stop(signal: string) {
  console.info("[kafka-consumer] Stopping", { signal });
  await consumer.disconnect();
  await deadLetterProducer.disconnect();
  await redis.quit();
}

process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));

void start().catch(async (error: unknown) => {
  console.error("[kafka-consumer] Startup failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  await redis.quit().catch(() => undefined);
  process.exitCode = 1;
});
