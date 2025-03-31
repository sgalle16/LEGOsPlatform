const { Kafka, logLevel } = require('kafkajs');
const logger = require('./utils/logger'); // Assuming your logger path is correct

// --- Kafka Configuration ---
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'kafka:9092';
const CLIENT_ID = 'api-gateway-client';

const kafka = new Kafka({
    clientId: CLIENT_ID,
    brokers: [KAFKA_BROKER],
    logLevel: logLevel.INFO, // INFO level - Adjust as needed (ERROR, WARN, etc)
    // retry logic for broker connection issues
    retry: { initialRetryTime: 300, retries: 10, maxRetryTime: 30000, factor: 2 } 
});

const producer = kafka.producer();
let isProducerConnected = false;

// --- Kafka Topics ---
const TOPICS = {
    TICKET_GENERATED: 'ticket-generated', // Renamed for clarity, assuming this is generation/purchase
    TICKET_TRANSFER: 'ticket-transfers',
    USER_NOTIFICATION: 'user-notifications'
    // Add other topics as needed
};

// --- Connection Management ---
const connectProducer = async () => {
    try {
        await producer.connect();
        isProducerConnected = true;
        logger.info(`Kafka Producer connected successfully to ${KAFKA_BROKER}`);
    } catch (error) {
        logger.error('Failed to connect Kafka Producer:', error);
        // Implement retry logic or exit strategy if connection is critical
        throw error; // Re-throw to be handled by the main server startup
    }
};

const disconnectProducer = async () => {
    if (!isProducerConnected) {
        logger.warn('Kafka Producer is not connected, skipping disconnection.');
        return;
    }
    try {
        await producer.disconnect();
        isProducerConnected = false;
        logger.info('Kafka Producer disconnected successfully.');
    } catch (error) {
        logger.error('Error disconnecting Kafka Producer:', error);
    }
};

// --- Event Production Functions ---

/**
 * Produces an event when a new ticket is generated or purchased.
 * @param {object} ticketData - The ticket data object (e.g., {id, name, ticketNumber, ...})
 */
const produceTicketGeneratedEvent = async (ticketData) => {
    if (!isProducerConnected) {
        throw new Error('Kafka Producer is not connected.');
    }
    if (!ticketData || !ticketData.id) {
         // Use ticketNumber or another unique identifier if id might be missing initially
        throw new Error('Invalid ticket data: Missing required fields (like id).');
    }

    try {
        const message = {
            // Use a consistent unique identifier for the key for partitioning
            key: String(ticketData.id),
            value: JSON.stringify(ticketData)
        };
        await producer.send({
            topic: TOPICS.TICKET_GENERATED,
            messages: [message]
        });
        logger.info(`Event produced to topic ${TOPICS.TICKET_GENERATED} for ticket ID: ${ticketData.id}`);
    } catch (error) {
        logger.error(`Error producing event to ${TOPICS.TICKET_GENERATED}:`, error);
        throw error; // Re-throw to be handled by the caller (e.g., the controller)
    }
};

/**
 * Produces an event when a ticket is transferred.
 * @param {object} transferData - Data related to the ticket transfer (e.g., {ticketId, fromUser, toUser, ...})
 */
const produceTicketTransferEvent = async (transferData) => {
     if (!isProducerConnected) {
        throw new Error('Kafka Producer is not connected.');
    }
     if (!transferData || !transferData.ticketId) { // Assuming ticketId is the relevant key here
        throw new Error('Invalid transfer data: Missing required fields (like ticketId).');
    }

    try {
         const message = {
            key: String(transferData.ticketId), // Use ticketId or relevant key
            value: JSON.stringify(transferData)
        };
        await producer.send({
            topic: TOPICS.TICKET_TRANSFER,
            messages: [message]
        });
        logger.info(`Event produced to topic ${TOPICS.TICKET_TRANSFER} for ticket ID: ${transferData.ticketId}`);
    } catch (error) {
        logger.error(`Error producing event to ${TOPICS.TICKET_TRANSFER}:`, error);
        throw error; // Re-throw
    }
};


// --- Export ---
module.exports = {
    connectProducer,
    disconnectProducer,
    produceTicketGeneratedEvent, // Export the specific function needed
    produceTicketTransferEvent, // Export others if needed elsewhere
    TOPICS // Export topics if needed elsewhere
};