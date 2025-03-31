import winston from 'winston'; 
const { combine, timestamp, printf, errors, colorize, json } = winston.format;

// Formato para la consola (legible)
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${message}${stack ? `\n${stack}` : ''}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json() // Formato por defecto para archivos
  ),
  transports: [
    // Log a la consola
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
      handleExceptions: true, // Capturar excepciones no manejadas
      level: 'info' 
    }),
    // Añadir transportes de archivo si necesita igual que en api-gateway
    new winston.transports.File({ filename: 'logs/error.log', level: 'error', handleExceptions: true }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ],
  exitOnError: false
});

export default logger; 