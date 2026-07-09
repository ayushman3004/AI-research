import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

// Diagnostic log: always print which credentials are present on startup
console.log('[firebase-admin] Credential check:', {
  projectId: projectId ? '✓ set' : '✗ MISSING',
  clientEmail: clientEmail ? '✓ set' : '✗ MISSING',
  privateKey: privateKey
    ? `✓ set (${privateKey.length} chars, starts: ${privateKey.slice(0, 27)})`
    : '✗ MISSING',
});

let app: App | undefined;

if (getApps().length === 0) {
  if (projectId && clientEmail && privateKey) {
    let formattedPrivateKey = privateKey.trim();
    // Strip surrounding double quotes if present (e.g. from copy-pasting raw env strings)
    if (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) {
      formattedPrivateKey = formattedPrivateKey.substring(1, formattedPrivateKey.length - 1);
    }
    // Strip surrounding single quotes if present
    if (formattedPrivateKey.startsWith("'") && formattedPrivateKey.endsWith("'")) {
      formattedPrivateKey = formattedPrivateKey.substring(1, formattedPrivateKey.length - 1);
    }
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');

    try {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });
    } catch (err: any) {
      console.error('Failed to initialize Firebase Admin app with credentials:', err);
    }
  } else {
    console.warn(
      `Firebase Admin credentials are not fully configured. Missing: ${
        [
          !projectId && 'FIREBASE_ADMIN_PROJECT_ID',
          !clientEmail && 'FIREBASE_ADMIN_CLIENT_EMAIL',
          !privateKey && 'FIREBASE_ADMIN_PRIVATE_KEY',
        ]
          .filter(Boolean)
          .join(', ')
      }. API auth verification will fail.`
    );
  }
} else {
  app = getApp();
}

export const adminAuth: Auth | null = app ? getAuth(app) : null;
