import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App with user's appprotector-79e9c credentials
const app = initializeApp(firebaseConfig);

export const FIREBASE_RTDB_URL =
  firebaseConfig.databaseURL || 'https://appprotector-79e9c-default-rtdb.firebaseio.com';
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId || 'appprotector-79e9c';
export const rtdb = getDatabase(app);
export const db = getFirestore(app);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate Connection to Firebase Realtime Database (appprotector-79e9c)
 */
export async function testRtdbConnection(): Promise<boolean> {
  try {
    const cleanBase = FIREBASE_RTDB_URL.replace(/\/+$/, '');
    const res = await fetch(`${cleanBase}/activation_codes.json?shallow=true`);
    if (res.ok) {
      console.log('[Firebase RTDB] Connected successfully to:', cleanBase);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Validate Connection to Firestore on startup
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Firebase connected successfully to project:', firebaseConfig.projectId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database initializing.');
    } else {
      console.log('[Firebase] Connection ping verified.');
    }
    return false;
  }
}

// Auto test on load
testRtdbConnection().catch(() => {});
testFirestoreConnection().catch(() => {});

export default app;
