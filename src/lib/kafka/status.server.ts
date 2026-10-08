import Redis from "ioredis";
import type { ConsumerEventStatus, DomainEventRow } from "../events/domain-event";

export async function getConsumerEventStatuses(
  workspaceId: string,
  events: DomainEventRow[],
) {
  if (!process.env.REDIS_URL || events.length === 0) {
    return {
      available: events.length === 0 || Boolean(process.env.REDIS_URL),
      statuses: {} as Record<string, ConsumerEventStatus>,
    };
  }

  const redis = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  try {
    await redis.connect();
    const values = await redis.mget(
      ...events.map((event) => `sciq:event-status:${workspaceId}:${event.event_id}`),
    );
    const statuses: Record<string, ConsumerEventStatus> = {};
    events.forEach((event, index) => {
      const value = values[index];
      if (!value) return;
      try {
        const parsed = JSON.parse(value) as ConsumerEventStatus;
        if (parsed.status === "PROCESSED" || parsed.status === "FAILED") {
          statuses[event.event_id] = parsed;
        }
      } catch (error) {
        console.error("[domain-events] Invalid consumer status record", {
          eventId: event.event_id,
          workspaceId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    });
    return { available: true, statuses };
  } catch (error) {
    console.warn("[domain-events] Consumer status store is unavailable", {
      workspaceId,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      available: false,
      statuses: {} as Record<string, ConsumerEventStatus>,
    };
  } finally {
    redis.disconnect();
  }
}
