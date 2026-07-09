/**
 * lib/firebase/admin.ts
 *
 * Uses a lazy factory with require() instead of top-level ES module imports.
 * Turbopack/webpack only tree-shakes and bundles static `import` statements.
 * Dynamic `require()` calls are resolved at runtime by Node.js, bypassing the
 * "Failed to load external module firebase-admin-*" bundling error on Vercel.
 */

let _authInstance: any = null;
let _initAttempted = false;

export function getAdminAuth(): any | null {
  if (_initAttempted) return _authInstance;
  _initAttempted = true;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  console.log('[firebase-admin] Credential check:', {
    projectId: projectId ? '✓ set' : '✗ MISSING',
    clientEmail: clientEmail ? '✓ set' : '✗ MISSING',
    privateKey: privateKey
      ? `✓ set (${privateKey.length} chars, starts: ${privateKey.slice(0, 27)})`
      : '✗ MISSING',
  });

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      '[firebase-admin] Missing credentials — auth will be unavailable. ' +
      'Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and ' +
      'FIREBASE_ADMIN_PRIVATE_KEY in your environment.'
    );
    return null;
  }

  try {
    // Use require() — not import — so the bundler never touches these packages.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initializeApp, getApps, getApp, cert } = require('firebase-admin/app');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAuth } = require('firebase-admin/auth');

    // Normalize the private key: strip surrounding quotes and convert \n literals
    let formattedKey = privateKey.trim();
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
      formattedKey = formattedKey.slice(1, -1);
    }
    if (formattedKey.startsWith("'") && formattedKey.endsWith("'")) {
      formattedKey = formattedKey.slice(1, -1);
    }
    formattedKey = formattedKey.replace(/\\n/g, '\n');

    const app =
      getApps().length === 0
        ? initializeApp({ credential: cert({ projectId, clientEmail, privateKey: formattedKey }) })
        : getApp();

    _authInstance = getAuth(app);
    console.log('[firebase-admin] Initialized successfully.');
  } catch (err: any) {
    console.error('[firebase-admin] Initialization failed:', err?.message ?? err);
    _authInstance = null;
  }

  return _authInstance;
}
