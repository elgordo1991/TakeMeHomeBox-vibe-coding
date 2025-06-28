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

// Connect to Firebase Auth emulator in development (optional)
if (import.meta.env.DEV && !auth.emulatorConfig) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
  } catch (error) {
    // Emulator connection failed, continue with production auth
    console.log("Firebase Auth emulator not available, using production");
  }
}

export default app;