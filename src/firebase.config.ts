import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

console.log('[FIREBASE CONFIG]', firebaseConfig);

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Auth
export const auth = getAuth(app);

// Firebase Firestore
export const db = getFirestore(app);

// Optional: Connect to Auth emulator locally
if (
  import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' &&
  import.meta.env.DEV &&
  !auth.emulatorConfig
) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    console.log("Connected to Firebase Auth emulator");
  } catch (error) {
    console.warn("Failed to connect to Firebase Auth emulator:", error);
  }
}

export default app;