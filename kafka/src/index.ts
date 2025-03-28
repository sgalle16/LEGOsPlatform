import TicketProducer from './producers/ticket.producer';
import TicketConsumer from './consumers/ticket.consumer';
import logger from './utils/logger';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const producer = new TicketProducer();
  const consumer = new TicketConsumer();

  try {
    // Connect producer and consumer
    await producer.connect();
    await consumer.connect();

    // Start consuming events
    await consumer.consumeTicketPurchases();

    // Example: Produce a sample ticket event
    await producer.produceTicketPurchaseEvent({
      id: uuidv4(),
      eventName: 'Summer Concert 2024',
      userId: 'user_123',
      purchaseDate: new Date(),
      price: 100.00,
      status: 'PURCHASED'
    });
  } catch (error) {
    logger.error('Error in Kafka application', error);
  }
}

main().catch(console.error);