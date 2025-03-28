import kafka, { TOPICS } from '../config/kafka.config';
import { Ticket } from '../interfaces/ticket.interface';
import logger from '../utils/logger';

class TicketProducer {
  private producer;

  constructor() {
    this.producer = kafka.producer();
  }

  async connect() {
    await this.producer.connect();
    logger.info('Kafka Producer Connected');
  }

  async disconnect() {
    await this.producer.disconnect();
    logger.info('Kafka Producer Disconnected');
  }

  async produceTicketPurchaseEvent(ticket: Ticket) {
    try {
      await this.producer.send({
        topic: TOPICS.TICKET_PURCHASE,
        messages: [
          { 
            key: ticket.id, 
            value: JSON.stringify(ticket)
          }
        ]
      });

      logger.info(`Ticket purchase event produced: ${ticket.id}`);
    } catch (error) {
      logger.error('Error producing ticket purchase event', error);
      throw error;
    }
  }
}

export default TicketProducer;