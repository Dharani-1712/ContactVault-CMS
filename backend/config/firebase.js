// ============================================================
// config/firebase.js  –  Firebase Admin SDK Initialisation
// ============================================================
const admin = require('firebase-admin');

// Option A: service-account JSON file (local dev)
// const serviceAccount = require('./serviceAccountKey.json');

// Option B: env-var (recommended for production/CI)
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Fallback: read from file during local development
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch {
    console.warn('⚠️  No Firebase service account found. Set FIREBASE_SERVICE_ACCOUNT env var.');
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

const db      = admin.firestore();
const auth    = admin.auth();
const storage = admin.storage();

module.exports = { admin, db, auth, storage };
