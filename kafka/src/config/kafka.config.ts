import { Kafka, logLevel } from 'kafkajs';
import dotenv from 'dotenv';
dotenv.config();
const kafka = new Kafka({
  clientId: 'ticket-system-client',
  brokers: [process.env.KAFKA_BROKER || 'kafka:9092'],  // Changed to 9092
  logLevel: logLevel.INFO
});
// Define topics
export const TOPICS = {
  TICKET_PURCHASE: 'ticket-purchases',
  TICKET_TRANSFER: 'ticket-transfers',
  USER_NOTIFICATION: 'user-notifications'
};
export default kafka;