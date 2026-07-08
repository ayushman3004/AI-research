import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

let app: App | undefined;

if (getApps().length === 0) {
  if (projectId && clientEmail && privateKey) {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
  } else {
    console.warn('Firebase Admin credentials are not fully configured. API auth verification will fail.');
  }
} else {
  app = getApp();
}

export const adminAuth: Auth | null = app ? getAuth(app) : null;
