import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCML5ycWHofMQDzX1zkWkBqIifd5QOjqRw",
  authDomain: "takemehomeboxvibe-coding.firebaseapp.com",
  projectId: "takemehomeboxvibe-coding",
  storageBucket: "takemehomeboxvibe-coding.firebasestorage.app",
  messagingSenderId: "59867782303",
  appId: "1:59867782303:web:ef4aa01eb4565e7e7156aa",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Auth
export const auth = getAuth(app);

// ✅ Firebase Firestore
export const db = getFirestore(app); // ✅ <--- this is what you were missing

// Optional: Auth emulator
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' && import.meta.env.DEV && !auth.emulatorConfig) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    console.log("Connected to Firebase Auth emulator");
  } catch (error) {
    console.warn("Failed to connect to Firebase Auth emulator:", error);
  }
}

export default app;