import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

try {
  // Initialize using Application Default Credentials
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  console.log('Firebase Admin SDK initialized using Application Default Credentials.');
} catch (error: any) {
  console.error('FATAL: Firebase Admin SDK initialization failed:', error.message);
  console.error('Ensure ADC are configured correctly (gcloud auth application-default login)');
  // Consider exiting if Firebase is absolutely critical for startup
  // process.exit(1);
}

// Exportar solo el módulo de autenticación si es lo único que se requiere
export const auth = admin.auth();
// o exportar todo admin si necesitas otras partes
// export default admin;
