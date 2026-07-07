import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsFGlCbz-Hd7Zaw46FVYchEqjLZljwnNk",
  authDomain: "airesearch-51249.firebaseapp.com",
  projectId: "airesearch-51249",
  storageBucket: "airesearch-51249.firebasestorage.app",
  messagingSenderId: "976236944344",
  appId: "1:976236944344:web:505d1d3faff111d4d8b0ad",
  measurementId: "G-EW4DZ2M7E9"
};

// Initialize Firebase client-side, verifying if already initialized to support HMR
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };