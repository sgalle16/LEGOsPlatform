import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || "postgresql://devuser:devpassword@postgres-db:5432/ticketsdb";

if (!databaseUrl) {
    console.error("[Database Config] FATAL: DATABASE_URL environment variable is not set.");
    process.exit(1);
}

// Crear el pool de conexiones
export const pool = new Pool({
    connectionString: databaseUrl,
    // Aumentar ligeramente el timeout de conexión puede ayudar en entornos Docker a veces
    connectionTimeoutMillis: 5000, // 5 segundos
    // añadir max connections si esperas mucha carga
    // max: 10,
});

// Listener para errores en clientes inactivos del pool
pool.on('error', (err, client) => {
    console.error('[Database Pool] Unexpected error on idle client', err);
    // Considerar estrategia de reintento o salida si los errores son graves/persistentes
});

// Función para probar la conexión al inicio (important!)
export const testDbConnection = async (): Promise<boolean> => {
    let client;
    try {
        console.log('[Database] Attempting to connect and test query...');
        client = await pool.connect(); // Intenta obtener un cliente
        await client.query('SELECT NOW()'); // ejecuta una consulta simple
        client.release(); // Libera el cliente de vuelta al pool
        console.log('[Database] Connection test successful.');
        return true;
    } catch (err: any) {
        console.error('[Database] FATAL: Connection test failed.', err.message);
        if (client) client.release(); // Intenta liberar si se obtuvo un cliente
        return false; // Indica fallo
    }
};

// Función para cerrar el pool (para shutdown limpio)
export const closeDbPool = async (): Promise<void> => {
    console.log('[Database Pool] Closing connection pool...');
    await pool.end(); // Cierra todas las conexiones
    console.log('[Database Pool] Pool closed.');
};

console.log('[Database Config] Connection pool configured.');