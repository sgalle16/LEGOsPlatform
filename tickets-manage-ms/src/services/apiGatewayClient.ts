import axios from 'axios';
import dotenv from 'dotenv';
import type { ApiGatewayData } from '../types';
import type { TransactionDataPayload, CreateTransactionResponse  } from '../types';

dotenv.config();

//const getTicketUrl = process.env.GET_TICKET_API_URL || "http://localhost:3000/getTicket";
const getTicketUrl = process.env.GET_TICKET_API_URL || "http://api-gateway:3000/getTicket";

if (!getTicketUrl) {
  console.error("[API Gateway Client] FATAL: GET_TICKET_API_URL is not defined in .env");
  process.exit(1);
}

export const fetchInitialData = async (): Promise<ApiGatewayData> => {
  console.log(`[API Gateway Client] Fetching data from ${getTicketUrl}...`);
  let responseData: any;

  try {
    const response = await axios.get(getTicketUrl, { timeout: 7000 });
    responseData = response.data;
  } catch (error: any) {
    const errorMessage = `Failed to fetch data from API Gateway (${getTicketUrl}): ${error.message}`;
    console.error(`[API Gateway Client] Error fetching data: ${error.message}`);
    throw new Error(errorMessage);
  }

  let initialData: ApiGatewayData | null = null;
  if (Array.isArray(responseData) && responseData.length > 0) {
    console.log("[API Gateway Client] Received array, using first element.");
    initialData = responseData[0] as ApiGatewayData;
  } else if (typeof responseData === 'object' && responseData !== null) {
    initialData = responseData as ApiGatewayData;
  }

  if (
    !initialData ||
    typeof initialData.id !== 'number' ||
    typeof initialData.ticketNumber !== 'string' || !initialData.ticketNumber ||
    typeof initialData.token !== 'string' || !initialData.token
  ) {
    const errorMsg = "Invalid data structure or missing required fields (id, ticketNumber, token) from API Gateway.";
    console.error("[API Gateway Client] Invalid data structure received:", JSON.stringify(responseData));
    throw new Error(errorMsg);
  }

  console.log(`[API Gateway Client] Data fetched successfully for user: ${initialData.user}, ticket: ${initialData.ticketNumber}`);
  return initialData;
};


// const createTransactionUrl = process.env.CREATE_TRANSACTION_API_URL || 'http://localhost:3000/createTransation'
const createTransactionUrl = process.env.CREATE_TRANSACTION_API_URL || 'http://api-gateway:3000/createTransation'

/**
 * Sends data to the /createTransation endpoint of the API Gateway.
 * @param transactionData The data payload for the transaction.
 * @returns The response from the API Gateway.
 * @throws Error if the POST request fails.
 */
export const postTransactionData = async (
  transactionData: TransactionDataPayload
): Promise<CreateTransactionResponse> => {
  console.log(`[API Gateway Client] Posting transaction data to ${createTransactionUrl}...`);
  try {
      const response = await axios.post<CreateTransactionResponse>(
          createTransactionUrl,
          transactionData, // El cuerpo de la solicitud POST
          {
              timeout: 7000, // Timeout
              headers: { 'Content-Type': 'application/json' } // Asegurar header correcto
          }
      );
      console.log('[API Gateway Client] Transaction data posted successfully.');
      return response.data; // Devuelve los datos de la respuesta
  } catch (error: any) {
      const errorMessage = `Failed to post transaction data to API Gateway (${createTransactionUrl}): ${error.message}`;
      console.error(`[API Gateway Client] Error posting transaction: ${error.message}`);
      if (axios.isAxiosError(error) && error.response) {
           console.error(`[API Gateway Client] Server responded with status ${error.response.status}:`, error.response.data);
      }
      throw new Error(errorMessage);
  }
};