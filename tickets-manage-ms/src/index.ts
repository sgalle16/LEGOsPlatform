// src/index.ts (renamed for clarity, or keep app.ts)
import dotenv from 'dotenv';
dotenv.config();

import { Kafka, logLevel as KafkaLogLevels } from 'kafkajs'; // Import Kafka
import './config/firebase'; // Initialize Firebase Admin SDK
// Assuming these services remain largely the same internally
import { verifyFirebaseToken } from './services/firebaseAuthService';
import { validateTicketWithFlask } from './services/ticketValidationService';
// Keep your existing types
import type { ApiGatewayData, FirebaseDecodedToken, TicketValidationResult } from './types';

// --- Kafka Configuration ---
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'ticket-processor-client';
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'ticket-processor-group'; // Crucial for consumers
const KAFKA_TOPIC_TICKETS = process.env.KAFKA_TOPIC_TICKETS || 'ticket-generated'; // Topic to consume from

const kafka = new Kafka({
    clientId: KAFKA_CLIENT_ID,
    brokers: KAFKA_BROKERS,
    logLevel: KafkaLogLevels.INFO, // Adjust as needed (WARN, ERROR, INFO, DEBUG)
    // Add retry logic if desired for broker connection issues
    // retry: {
    //   initialRetryTime: 300,
    //   retries: 5
    // }
});

const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
let isConsumerRunning = false;

// --- Lógica Principal de Procesamiento por Mensaje ---
// This function replaces the core logic of processTicketCycle
async function processTicketMessage(messagePayload: string, messageOffset: string): Promise<void> {
    let stepFailed: 'parsing' | 'firebase_auth' | 'ticket_validation' | undefined = undefined;
    let errorMessage: string | undefined = undefined;
    let ticketData: ApiGatewayData | null = null;
    let decodedFirebaseToken: FirebaseDecodedToken | null = null;

    console.log(`[Consumer] Processing message at offset ${messageOffset}`);

    try {
        // --- Paso 0: Parse ---
        stepFailed = 'parsing';
        ticketData = JSON.parse(messagePayload) as ApiGatewayData;
        // Basic validation of the parsed data structure
        if (!ticketData || typeof ticketData !== 'object' || !ticketData.id || !ticketData.token || !ticketData.ticketNumber) {
            throw new Error('Invalid or incomplete ticket data structure received.');
        }
        console.log(`[Consumer] Parsed ticket data for ID: ${ticketData.id}, User: ${ticketData.user}`);

        // --- Paso 1: Firebase Auth ---
        stepFailed = 'firebase_auth';
        decodedFirebaseToken = await verifyFirebaseToken(ticketData.token);
        console.log(`[Consumer] Firebase token validated for UID: ${decodedFirebaseToken.uid} (matches user: ${ticketData.user})`);
        // Optional: Add check if decodedFirebaseToken.uid corresponds to ticketData.user if needed

        // --- Paso 2: Ticket Validation (API Flask) ---
        stepFailed = 'ticket_validation';
        const ownerIdString = String(ticketData.id); // Convertir ID a string
        const ticketValidationResult = await validateTicketWithFlask(ownerIdString, ticketData.ticketNumber);

        // --- Procesamiento Exitoso (del mensaje) ---
        console.log(`[Consumer] Message processed successfully for ticket ID: ${ticketData.id}`);
        console.log(`[Consumer] --> Ticket Validation Status: ${ticketValidationResult.status}`);
        console.log(`[Consumer] --> Details: ${ticketValidationResult.details}`);

    } catch (error: any) {
        // --- Fallo en el procesamiento del mensaje ---
        errorMessage = error.message;
        console.error(`[Consumer] ERROR processing message at offset ${messageOffset} during step '${stepFailed}': ${errorMessage}`);
        // Log the problematic data (be careful with sensitive info like tokens in production logs)
        console.error(`[Consumer] --> Failed Message Data (structure): ${JSON.stringify({id: ticketData?.id, user: ticketData?.user, ticketNumber: ticketData?.ticketNumber})}`);
        // NOTE: This error typically won't stop the consumer. It will commit the offset
        // and move to the next message unless configured otherwise or if the error is thrown out.
        // Consider sending failed messages to a Dead Letter Queue (DLQ) topic for later analysis/retry.
    } finally {
         console.log(`[Consumer] Finished processing message at offset ${messageOffset}.`);
    }
}

// --- Inicio del Servicio ---
async function startService() {
    console.log('---------------------------------------------');
    console.log('--- Ticket Processing Service (Kafka Consumer) Starting ---');
    console.log(`--- Consuming from Topic: ${KAFKA_TOPIC_TICKETS} ---`);
    console.log(`--- Consumer Group ID: ${KAFKA_GROUP_ID} ---`);
    console.log(`--- Kafka Brokers: ${KAFKA_BROKERS.join(', ')} ---`);
    console.log('---------------------------------------------');

    try {
        // Connect the consumer
        await consumer.connect();
        console.log('[Consumer] Connected to Kafka brokers.');

        // Subscribe to the topic
        await consumer.subscribe({ topic: KAFKA_TOPIC_TICKETS, fromBeginning: false }); // false = only new messages
        console.log(`[Consumer] Subscribed to topic: ${KAFKA_TOPIC_TICKETS}`);

        // Start consuming messages
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if (!message || !message.value) {
                     console.warn(`[Consumer] Received empty message on topic ${topic} partition ${partition}. Skipping.`);
                     return;
                }
                const messagePayload = message.value.toString();
                const messageOffset = message.offset;

                // Process the message using our dedicated function
                await processTicketMessage(messagePayload, messageOffset);

                // Note: Offsets are committed automatically by default based on successful
                // completion of eachMessage unless autoCommit is disabled.
            },
        });
        isConsumerRunning = true;
        console.log('[Consumer] Consumer is running and waiting for messages...');

    } catch (error) {
        console.error('[Consumer] Failed to start Kafka consumer:', error);
        process.exit(1); // Exit if we can't connect/subscribe
    }
}

// --- Manejo de Cierre Limpio ---
async function shutdownService(signal: string) {
    console.log(`\n[Service] Received ${signal}. Shutting down gracefully...`);
    if (isConsumerRunning) {
        try {
            await consumer.disconnect();
            console.log('[Consumer] Kafka consumer disconnected.');
        } catch (error) {
            console.error('[Consumer] Error disconnecting Kafka consumer:', error);
        } finally {
             isConsumerRunning = false;
        }
    } else {
         console.log('[Consumer] Consumer was not running, skipping disconnect.');
    }

    // Add any other cleanup needed (e.g., database connections)

    console.log('[Service] Shutdown complete. Exiting.');
    process.exit(0);
}

process.on('SIGINT', () => shutdownService('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => shutdownService('SIGTERM')); // Docker stop, Kubernetes termination

// --- Arrancar el servicio ---
startService();