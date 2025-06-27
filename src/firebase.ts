// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCML5ycWHofMQDzX1zkWkBqIifd5QOjqRw",
  authDomain: "takemehomeboxvibe-coding.firebaseapp.com",
  projectId: "takemehomeboxvibe-coding",
  storageBucket: "takemehomeboxvibe-coding.firebasestorage.app",
  messagingSenderId: "59867782303",
  appId: "1:59867782303:web:ef4aa01eb4565e7e7156aa",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);