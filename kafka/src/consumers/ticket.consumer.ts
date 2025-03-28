import kafka, { TOPICS } from '../config/kafka.config';
import { Ticket } from '../interfaces/ticket.interface';
import logger from '../utils/logger';

class TicketConsumer {
  private consumer;

  constructor() {
    this.consumer = kafka.consumer({ 
      groupId: 'ticket-processing-group' 
    });
  }

  async connect() {
    await this.consumer.connect();
    logger.info('Kafka Consumer Connected');
  }

  async disconnect() {
    await this.consumer.disconnect();
    logger.info('Kafka Consumer Disconnected');
  }

  async consumeTicketPurchases() {
    await this.consumer.subscribe({ 
      topic: TOPICS.TICKET_PURCHASE,
      fromBeginning: true 
    });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const ticket: Ticket = JSON.parse(message.value!.toString());
          
          // Process the ticket
          this.processTicket(ticket);
        } catch (error) {
          logger.error('Error consuming ticket purchase', error);
        }
      }
    });
  }

  private processTicket(ticket: Ticket) {
    // Implement ticket processing logic
    logger.info(`Processing ticket: ${ticket.id}`);
    // Example: validation, database storage, etc.
  }
}

export default TicketConsumer;