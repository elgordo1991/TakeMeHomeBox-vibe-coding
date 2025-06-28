import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

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

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Only connect to Firebase Auth emulator if explicitly enabled
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' && import.meta.env.DEV && !auth.emulatorConfig) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    console.log("Connected to Firebase Auth emulator");
  } catch (error) {
    console.warn("Failed to connect to Firebase Auth emulator:", error);
  }
}

export default app;