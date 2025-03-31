import { auth } from '../config/firebase';
import type { FirebaseDecodedToken } from '../types';
import logger from '../utils/logger';

/**
 * Validates a Firebase ID token.
 * @param token The Firebase ID token string.
 * @returns The decoded token payload if valid.
 * @throws Error if the token is invalid or expired.
 */
export const verifyFirebaseToken = async (token: string): Promise<FirebaseDecodedToken> => {
  if (!token) {
    throw new Error('Firebase token verification failed: No token provided.');
  }
  logger.info('[Firebase Auth] Verifying Firebase token...');
  try {
    const decodedToken = await auth.verifyIdToken(token);
    logger.info(`[Firebase Auth] Token verified successfully for UID: ${decodedToken.uid}`);
    return decodedToken;
  } catch (error: any) {
    const errorMessage = `Firebase token verification failed: ${error.message} (Code: ${error.code})`;
    logger.error('[Firebase Auth] Token verification failed:', error.code, error.message);
    throw new Error(errorMessage);
  }
};