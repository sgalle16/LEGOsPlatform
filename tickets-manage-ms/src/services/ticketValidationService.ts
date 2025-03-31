import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';
import type { FlaskValidationResponse, TicketValidationResult } from '../types';
import logger from '../utils/logger';

dotenv.config();

//const ticketsApiUrl = process.env.TICKETS_API_URL || "http://localhost:5002/api/ticket" ;
const ticketsApiUrl = process.env.TICKETS_API_URL || "http://api-tickets:5002/api/ticket" ;

if (!ticketsApiUrl) {
  logger.error("[Ticket Validation] FATAL: TICKET_API_URL is not defined in .env");
  process.exit(1);
}

export const validateTicketWithFlask = async (
    userId: string, // userId como STRING
    ticketId: string
): Promise<TicketValidationResult> => {
  logger.info(`[Ticket Validation] Validating ticket ${ticketId} for owner ${userId} via ${ticketsApiUrl}...`);

  try {
    const response = await axios.get<FlaskValidationResponse>(ticketsApiUrl, {
      params: {
        id: userId, // El param 'id' que espera Flask
        ticket_id: ticketId,
      },
      timeout: 5000,
      // Validar solo status 2xx como éxito para Axios
      validateStatus: (status) => status >= 200 && status < 300,
    });

    // Éxito HTTP 200 y status "success" en JSON
    if (response.data.status === 'success' && response.data.data) {
      logger.info(`[Ticket Validation] Success: Ticket ${ticketId} is valid.`);
      return {
          status: 'validated',
          details: `Ticket ${ticketId} is valid. Event: ${response.data.data.event}`,
          data: response.data.data,
      };
    } else {
      // HTTP 200 pero status "error" en JSON (caso raro)
      const details = `Validation API reported an issue: ${response.data.message || 'Unknown error'}`;
      logger.warn(`[Ticket Validation] API returned 200 but status is error: ${details}`);
      return { status: 'validation_failed', details };
    }

  } catch (error: any) {
    let result: TicketValidationResult;
    const baseMessage = `[Ticket Validation] Error validating ticket ${ticketId} for owner ${userId}:`;

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<FlaskValidationResponse>;
      if (axiosError.response) {
        // Error con respuesta del servidor (4xx, 5xx)
        const status = axiosError.response.status;
        const responseData = axiosError.response.data;
        const message = responseData?.message || axiosError.message;

        if (status === 404) {
            result = { status: 'not_found', details: message };
            logger.info(`${baseMessage} Ticket not found (404).`);
        } else if (status === 403) {
            result = { status: 'owner_mismatch', details: message };
            logger.info(`${baseMessage} Owner mismatch (403).`);
        } else {
            result = { status: 'validation_failed', details: `HTTP ${status}: ${message}` };
            logger.error(`${baseMessage} HTTP Error ${status}: ${message}`);
        }
      } else {
        // Error sin respuesta (red, timeout)
        result = { status: 'validation_failed', details: `Network/Request Error: ${axiosError.message}` };
        logger.error(`${baseMessage} Network/Request Error: ${axiosError.message}`);
      }
    } else {
      // Error inesperado no-Axios
      result = { status: 'validation_failed', details: `Unexpected error: ${error.message}` };
      logger.error(`${baseMessage} Unexpected Error: ${error.message}`);
    }
    // Lanzamos un error para detener el flujo principal si la validación falla
    throw new Error(result.details);
    // Si quisiera continuar incluso si falla, retorna 'result' 
    // return result;
  }
};