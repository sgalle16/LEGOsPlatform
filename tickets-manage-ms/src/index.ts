// src/app.ts
import dotenv from 'dotenv';
dotenv.config();

import './config/firebase';
import { fetchInitialData } from './services/apiGatewayClient';
import { verifyFirebaseToken } from './services/firebaseAuthService';
import { validateTicketWithFlask } from './services/ticketValidationService';
import type { ProcessingResult, ApiGatewayData, FirebaseDecodedToken, TicketValidationResult } from './types';

// --- Configuración ---
const pollingIntervalMs = parseInt(process.env.POLLING_INTERVAL_MS || '10000', 10); // Default 10 secs
let isProcessing = false; // Flag para evitar solapamiento
let pollingTimer: NodeJS.Timeout | null = null;

// --- Lógica Principal del Ciclo de Procesamiento ---
async function processTicketCycle(): Promise<void> {
    if (isProcessing) {
        console.log('[Polling] Skipping cycle, previous one still running.');
        return;
    }

    isProcessing = true;
    console.log(`[Polling] Starting new processing cycle at ${new Date().toISOString()}`);

    let initialData: ApiGatewayData | null = null;
    let decodedFirebaseToken: FirebaseDecodedToken | null = null;
    let stepFailed: ProcessingResult['stepFailed'] = undefined;
    let errorMessage: string | undefined = undefined;

    try {
        // --- Paso 1: Fetch ---
        stepFailed = 'fetch';
        initialData = await fetchInitialData();

        // --- Paso 2: Firebase Auth ---
        stepFailed = 'firebase_auth';
        decodedFirebaseToken = await verifyFirebaseToken(initialData.token);
        console.log(`[Polling] Firebase token validated for UID: ${decodedFirebaseToken.uid}`);

        // --- Paso 3: Ticket Validation (API Flask) ---
        stepFailed = 'ticket_validation';
        const ownerIdString = String(initialData.id); // Convertir ID a string
        const ticketValidationResult = await validateTicketWithFlask(ownerIdString, initialData.ticketNumber);

        // --- Procesamiento Exitoso (del ciclo) ---
        console.log(`[Polling] Cycle completed. Ticket Validation Status: ${ticketValidationResult.status}`);
        console.log(`[Polling] Details: ${ticketValidationResult.details}`);

        // --- Punto de Possible Integración Kafka  ---
        // Aquí podrías publicar el resultado (exito o fallo de validación del *ticket*) en Kafka
        // const kafkaPayload = { /* ... datos relevantes ... */ };
        // if (ticketValidationResult.status === 'validated') {
        //    console.log('[Kafka] Publishing validated ticket event...');
        //    // await kafkaProducer.send({ topic: 'ticket-validated', messages: [{ value: JSON.stringify(kafkaPayload) }] });
        // } else {
        //    console.log(`[Kafka] Publishing invalid ticket event (${ticketValidationResult.status})...`);
        //    // await kafkaProducer.send({ topic: 'ticket-invalid', messages: [{ value: JSON.stringify(kafkaPayload) }] });
        // }
        // --- Fin Kafka ---

    } catch (error: any) {
        // --- Fallo en el ciclo ---
        errorMessage = error.message;
        console.error(`[Polling] ERROR during step '${stepFailed}': ${errorMessage}`);
        // No detenemos el polling, lo intentará de nuevo en el siguiente intervalo
    } finally {
        isProcessing = false;
        console.log('[Polling] Cycle finished.');
    }
}

// --- Inicio del Servicio ---
function startService() {
    console.log('---------------------------------------------');
    console.log('--- Ticket Processing Service Starting ---');
    console.log(`--- Polling Interval: ${pollingIntervalMs} ms ---`);
    console.log('---------------------------------------------');

    // Ejecutar inmediatamente al inicio y luego establecer el intervalo
    processTicketCycle(); // Ejecuta la primera vez
    pollingTimer = setInterval(processTicketCycle, pollingIntervalMs); // Inicia el polling

    console.log('[Polling] Service started. Initial cycle triggered.');
}

// --- Manejo de Cierre Limpio ---
function shutdownService(signal: string) {
    console.log(`\n[Service] Received ${signal}. Shutting down gracefully...`);
    if (pollingTimer) {
        clearInterval(pollingTimer);
        console.log('[Polling] Polling stopped.');
    }
    // Añadir limpieza de conexiones (ej: Kafka, DB) ?
    // await kafkaProducer.disconnect();
    console.log('[Service] Shutdown complete. Exiting.');
    process.exit(0);
}

process.on('SIGINT', () => shutdownService('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => shutdownService('SIGTERM')); // Docker stop, Kubernetes termination

// --- Arrancar el servicio ---
startService();