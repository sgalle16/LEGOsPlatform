import type { DecodedIdToken } from 'firebase-admin/auth';

// Datos esperados de la API Gateway (/getTicket)
export interface ApiGatewayData {
  id: number; // El ID numérico que mapearemos a user_id (string)
  name: string;
  ticketNumber: string; // El ticket_id para Flask api
  ticketName: string;
  user: string; // Username o
  token: string; // Token de Firebase
}

// Datos decodificados del token de Firebase
export type FirebaseDecodedToken = DecodedIdToken;

// Datos de éxito de la API Flask
export interface FlaskValidationSuccessData {
  event: string;
  ticket_id: string;
  user_id: string; // Flask devuelve user_id
  date: string;
}

// Respuesta completa de la API Flask
export interface FlaskValidationResponse {
  status: "success" | "error";
  message?: string;
  data?: FlaskValidationSuccessData;
}

// Resultado del estado de validación del ticket en API tickets
export interface TicketValidationResult {
    status: 'validated' | 'not_found' | 'owner_mismatch' | 'validation_failed';
    details: string;
    data?: FlaskValidationSuccessData; // Datos del ticket si es válido
}

// Resultado final de todo el proceso
export interface ProcessingResult {
    success: boolean; // Indica si todo el flujo tuvo éxito
    stepFailed?: 'fetch' | 'firebase_auth' | 'ticket_validation'; // Indica dónde falló
    errorMessage?: string;
    details?: {
        apiGatewayData: ApiGatewayData;
        firebaseUserUid: string;
        ticketValidation: TicketValidationResult;
    }
}

//createTransaction
// datos esperadosde API Gateway (/createTransaction)
export interface TransactionDataPayload {
  id: number;
  name: string;
  ticketNumber: string;
  ticketName: string;
  user: string;
  //token: string;

  // otros campos de la transacción?
  // transactionValue?: number;
  // paymentMethod?: string;
}

// tipo para respuesta esperada de createTransaction
export interface CreateTransactionResponse {
  message: string;
  data: TransactionDataPayload; // O lo que devuelva la api
}


// ---------//  // ---------