import { DOMAIN_EVENTS_DLQ_TOPIC, DOMAIN_EVENTS_TOPIC, getKafka } from "./config.server";

const kafka = getKafka();
if (!kafka) throw new Error("Set KAFKA_BROKERS before creating SupplyChainIQ event topics.");

const admin = kafka.admin();
try {
  await admin.connect();
  await admin.createTopics({
    waitForLeaders: true,
    topics: [
      { topic: DOMAIN_EVENTS_TOPIC, numPartitions: 3, replicationFactor: 1 },
      { topic: DOMAIN_EVENTS_DLQ_TOPIC, numPartitions: 1, replicationFactor: 1 },
    ],
  });
  console.info("[kafka] SupplyChainIQ topics are ready", {
    topics: [DOMAIN_EVENTS_TOPIC, DOMAIN_EVENTS_DLQ_TOPIC],
  });
} finally {
  await admin.disconnect();
}
