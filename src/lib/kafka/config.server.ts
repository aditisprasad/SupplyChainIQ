import { Kafka, logLevel, type KafkaConfig } from "kafkajs";

export const DOMAIN_EVENTS_TOPIC = "supplychain.domain-events.v1";
export const DOMAIN_EVENTS_DLQ_TOPIC = "supplychain.domain-events.dlq.v1";
export const DOMAIN_EVENTS_GROUP = "supplychain-projections-v1";

export function kafkaConfig(): KafkaConfig | null {
  const brokers = (process.env.KAFKA_BROKERS ?? "")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);
  if (brokers.length === 0) return null;

  const username = process.env.KAFKA_SASL_USERNAME;
  const password = process.env.KAFKA_SASL_PASSWORD;
  const mechanism = process.env.KAFKA_SASL_MECHANISM;
  if ((username || password || mechanism) && !(username && password && mechanism)) {
    throw new Error(
      "KAFKA_SASL_USERNAME, KAFKA_SASL_PASSWORD, and KAFKA_SASL_MECHANISM must be configured together.",
    );
  }
  if (
    mechanism &&
    mechanism !== "plain" &&
    mechanism !== "scram-sha-256" &&
    mechanism !== "scram-sha-512"
  ) {
    throw new Error("KAFKA_SASL_MECHANISM must be plain, scram-sha-256, or scram-sha-512.");
  }

  return {
    clientId: process.env.KAFKA_CLIENT_ID ?? "supplychainiq",
    brokers,
    connectionTimeout: 2_000,
    requestTimeout: 5_000,
    retry: { retries: 2, initialRetryTime: 250, maxRetryTime: 2_000 },
    logLevel: logLevel.NOTHING,
    ...(process.env.KAFKA_SSL === "true" && { ssl: true }),
    ...(username && password && mechanism
      ? {
          sasl: {
            mechanism,
            username,
            password,
          },
        }
      : {}),
  };
}

let kafkaInstance: Kafka | undefined;
export function getKafka(): Kafka | null {
  const config = kafkaConfig();
  if (!config) return null;
  kafkaInstance ??= new Kafka(config);
  return kafkaInstance;
}
