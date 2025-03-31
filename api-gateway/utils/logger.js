const winston = require('winston');
const { combine, timestamp, printf, errors, colorize } = winston.format;

// Formato para la consola (legible)
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${message}${stack ? `\n${stack}` : ''}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info', 
  format: combine(
    errors({ stack: true }), 
    timestamp(),
    winston.format.json() // Formato por defecto para archivos
  ),
  transports: [
    // Log a la consola
    new winston.transports.Console({
      format: combine(
        colorize(), 
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), 
        consoleFormat 
      ),
      handleExceptions: true // Capturar excepciones no manejadas
    }),
    // Opcional: Log de errores a archivo
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error', // Solo errores graves
      handleExceptions: true
    }),
    // Opcional: Log combinado a archivo
    new winston.transports.File({
      filename: 'logs/combined.log'
      // Hereda el nivel 'info' y el formato JSON por defecto
    })
  ],
  exitOnError: false // Important: no detener la aplicación si falla el logging
});

// Stream para Morgan (Express - para logs HTTP)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;