import dotenv from 'dotenv';
dotenv.config();
import { Kafka, logLevel as KafkaLogLevels, KafkaJSNonRetriableError  } from 'kafkajs'; // Import Kafka
import './config/firebase'; // Initialize Firebase Admin SDK
import logger from './utils/logger';
// db utils
import { saveValidationResult } from './services/databaseService'; 
import { testDbConnection, closeDbPool } from './config/database'; 
// services 
import { verifyFirebaseToken } from './services/firebaseAuthService';
import { validateTicketWithFlask } from './services/ticketValidationService';
// types 
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
    // retry logic for broker connection issues
    retry: { initialRetryTime: 300, retries: 10, maxRetryTime: 30000, factor: 2 }
});

const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID, retry: { retries: 3 }});
let isConsumerRunning = false;
let isShuttingDown = false;

// --- Lógica Principal de Procesamiento por Mensaje ---
async function processTicketMessage(messagePayload: string, messageOffset: string): Promise<boolean> {
    let stepFailed: 'parsing' | 'firebase_auth' | 'ticket_validation' | 'database_save' | undefined = undefined;
    let errorMessage: string | undefined = undefined;
    let ticketData: ApiGatewayData | null = null;
    let decodedFirebaseToken: FirebaseDecodedToken | null = null;
    let ticketValidationResult: TicketValidationResult | null = null
    
    logger.info(`[Consumer] Processing message at offset ${messageOffset}`);

    try {
        // --- Paso 0: Parse ---
        stepFailed = 'parsing';
        ticketData = JSON.parse(messagePayload) as ApiGatewayData;
        // Basic validation of the parsed data structure
        if (!ticketData || typeof ticketData !== 'object' || !ticketData.id || !ticketData.token || !ticketData.ticketNumber) {
            throw new Error('Invalid or incomplete ticket data structure received.');
        }
        logger.info(`[Consumer] Parsed ticket data for ID: ${ticketData.id}, User: ${ticketData.user}`);

        // --- Paso 1: Firebase Auth ---
        stepFailed = 'firebase_auth';
        decodedFirebaseToken = await verifyFirebaseToken(ticketData.token);
        logger.info(`[Consumer] Firebase Auth OK, token validated for UID: ${decodedFirebaseToken.uid} (matches user: ${ticketData.user})`);
        // Optional: Add check if decodedFirebaseToken.uid corresponds to ticketData.user if needed

        // --- Paso 2: Ticket Validation (API Flask) ---
        stepFailed = 'ticket_validation';
        const ownerIdString = String(ticketData.id); // Convertir ID a string
        const ticketValidationResult = await validateTicketWithFlask(ownerIdString, ticketData.ticketNumber);
        logger.info(`[Consumer] Ticket Validation Result: ${ticketValidationResult.status} - ${ticketValidationResult.details}`);
        
        // --- Paso 3: Guardar en Base de Datos ---
        stepFailed = 'database_save';
        logger.info("[Consumer] Attempting to save validation result to database...");
        await saveValidationResult({
            // Pass the correct data structure to saveValidationResult
            initialData: ticketData, // Pass the data 
            firebaseUser: decodedFirebaseToken,
            validationResult: ticketValidationResult,
        });
        logger.info("[Consumer] Validation result saved to Database successfully.");

        // --- Procesamiento Exitoso (del mensaje) ---
        logger.info(`[Consumer] Successfully processed message offset ${messageOffset}`);
        logger.info(`[Consumer] Message processed successfully for ticket ID: ${ticketData.id}, status: ${ticketValidationResult.status}, details: ${ticketValidationResult.details}`);

        return true;

    } catch (error: any) {
        // --- Fallo en el procesamiento del mensaje ---
        logger.error(`[Consumer] FAILURE at step '${stepFailed}' for offset ${messageOffset}: ${error.message}`, /*{ stack: error.stack }*/);        // Log the problematic data (be careful with sensitive info like tokens in production logs)
        logger.error(`[Consumer] --> Failed Message Data (structure): ${JSON.stringify({id: ticketData?.id, user: ticketData?.user, ticketNumber: ticketData?.ticketNumber})}`);        // NOTE: This error typically won't stop the consumer. It will commit the offset
        // and move to the next message unless configured otherwise or if the error is thrown out.
        // Consider sending failed messages to a Dead Letter Queue (DLQ) topic for later analysis/retry.
        if (error instanceof KafkaJSNonRetriableError) {
            logger.error(`[Consumer] --> Non-retriable error for offset ${messageOffset}. Message might be moved to DLQ if configured.`);
            return false; 
        }

        throw error; // Relanzar para reintentos de KafkaJS

        } finally {
        logger.info(`[Consumer] Finished attempt for message offset ${messageOffset}.`);
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
        // Probar Conexión a BD ---
        logger.info("[Service Init] Testing database connection...");
        const dbReady = await testDbConnection();
        if (!dbReady) throw new Error("Database connection failed on startup.");
        logger.info("[Service Init] Database connection successful.");

        // Connect the consumer
        await consumer.connect();
        logger.info('[Consumer] Connected to Kafka brokers.');

        // Subscribe to the topic
        await consumer.subscribe({ topic: KAFKA_TOPIC_TICKETS, fromBeginning: false }); // false = only new messages
        logger.info(`[Consumer] Subscribed to topic: ${KAFKA_TOPIC_TICKETS}`);

        // Start consuming messages
        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                if (isShuttingDown || !message || !message.value) {
                    logger.warn(`[Consumer] Received empty message on topic ${topic} partition ${partition}. Skipping.`);
                    return;
                }
                const messagePayload = message.value.toString();
                const messageOffset = message.offset;
                
                try {
                    // Process the message using our dedicated function
                    await processTicketMessage(messagePayload, messageOffset);

                    // Note: Offsets are committed automatically by default based on successful
                    // completion of eachMessage unless autoCommit is disabled.
                }catch (processingError: any) {
                    // Este catch se activa si processTicketMessage RELANZÓ un error (retriable)
                    logger.error(`[Consumer Run] Retriable error encountered for offset ${messageOffset} after processing attempt: ${processingError.message}. KafkaJS will handle retry.`);
                }
            },
        });
        isConsumerRunning = true;
        logger.info('[Consumer] Consumer is running and waiting for messages...');

    } catch (error: any) {
        logger.error('[Service Init] Failed to start service:', { error: error.message, stack: error.stack });
        await shutdownService('STARTUP_ERROR').catch(() => {});
        process.exit(1); // Exit if we can't connect/subscribe
    }
}

// --- Manejo de Cierre Limpio ---
async function shutdownService(signal: string) {
    if (isShuttingDown) return; // Prevenir ejecución múltiple
    isShuttingDown = true;
    logger.info(`\n[Service] Received ${signal}. Shutting down gracefully...`);
    
    // 1. Desconectar Kafka Consumer
    if (isConsumerRunning) {
        try {
            logger.info('[Consumer] Disconnecting Kafka consumer...');
            await consumer.disconnect();
            logger.info('[Consumer] Kafka consumer disconnected.');
        } catch (error: any) {
            logger.error('[Consumer] Error disconnecting Kafka consumer:', { error: error.message });
        } finally {
             isConsumerRunning = false;
        }
    } else {
         console.log('[Consumer] Consumer was not running, skipping disconnect.');
    }

    // 2. Cerrar Pool de Base de Datos
    try {
        logger.info('[Service] Closing database pool...');
        await closeDbPool();
        logger.info('[Service] Database pool closed.');
    } catch(dbError: any) { 
        logger.error('[Service] Error closing database pool:', { error: dbError.message }); 
    }
    
    logger.info('[Service] Shutdown complete. Exiting.');
    process.exit(0);
}

process.on('SIGINT', () => shutdownService('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => shutdownService('SIGTERM')); // Docker stop, Kubernetes termination

// --- Arrancar el servicio ---
startService();