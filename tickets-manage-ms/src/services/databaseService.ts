import { pool } from '../config/database';
import type { ApiGatewayData, FirebaseDecodedToken, TicketValidationResult } from '../types';

interface SaveDataArgs {
    initialData: ApiGatewayData;
    firebaseUser: FirebaseDecodedToken;
    validationResult: TicketValidationResult;
}

/**
 * Guarda el resultado de la validación en las tablas users y ticket_validations
 * usando una transacción para asegurar la atomicidad.
 */
export const saveValidationResult = async ({
    initialData,
    firebaseUser,
    validationResult,
}: SaveDataArgs): Promise<void> => {
    const client = await pool.connect(); // Obtener un cliente del pool
    console.log('[DB Service] Attempting to save validation result...');

    try {
        await client.query('BEGIN'); // Iniciar transacción

        // --- Paso 1: Insertar o Actualizar Usuario (Upsert) ---
        const userUpsertQuery = `
            INSERT INTO users (firebase_uid, name, first_seen_at, last_seen_at)
            VALUES ($1, $2, NOW(), NOW())
            ON CONFLICT (firebase_uid)
            DO UPDATE SET
                -- Actualiza el nombre solo si el nuevo valor no es NULL y es diferente
                name = COALESCE(EXCLUDED.name, users.name),
                last_seen_at = NOW()
            RETURNING firebase_uid; -- Devolver el UID para confirmar
        `;
        const userResult = await client.query(userUpsertQuery, [
            firebaseUser.uid,
            initialData.name || null // Asegurar que sea null si no viene
        ]);
        if (userResult.rowCount === 0) {
             // Esto no deberiaa pasar con ON CONFLICT...DO UPDATE, pero es una verificación extra
             throw new Error(`Failed to upsert user with UID: ${firebaseUser.uid}`);
        }
        console.log(`[DB Service] User record ensured for UID: ${userResult.rows[0].firebase_uid}`);


        // --- Paso 2: Insertar Registro de Validación ---
        const validationInsertQuery = `
            INSERT INTO ticket_validations (
                ticket_number,
                validated_by_uid,
                validation_status,
                validation_details,
                ticket_name,
                event_name,
                validated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING validation_id; -- Devolver ID para confirmar
        `;
        // Obtener event_name solo si la validación fue exitosa
        const eventName = validationResult.status === 'validated'
            ? validationResult.data?.event
            : null;

        const validationResultInsert = await client.query(validationInsertQuery, [
            initialData.ticketNumber,
            firebaseUser.uid,
            validationResult.status,
            validationResult.details, // Mensaje de éxito o error de validación
            initialData.ticketName || null,
            eventName,
        ]);
        if (validationResultInsert.rowCount === 0) {
             throw new Error(`Failed to insert validation record for ticket: ${initialData.ticketNumber}`);
        }
        console.log(`[DB Service] Ticket validation record inserted (ID: ${validationResultInsert.rows[0].validation_id}) for ticket: ${initialData.ticketNumber}`);


        // --- Confirmar Transacción ---
        await client.query('COMMIT');
        console.log('[DB Service] Transaction committed successfully.');

    } catch (error: any) {
        console.error('[DB Service] Error during database operation, rolling back transaction:', error.message);
        try {
            await client.query('ROLLBACK'); // Intentar deshacer la transacción
            console.log('[DB Service] Transaction rolled back.');
        } catch (rollbackError: any) {
            console.error('[DB Service] Error rolling back transaction:', rollbackError.message);
        }
        // Relanzar el error para que el proceso principal sepa que falló
        throw new Error(`Database operation failed: ${error.message}`);
    } finally {
        client.release(); // MUY IMPORTANTE: Liberar el cliente de vuelta al pool
        console.log('[DB Service] Database client released.');
    }
};