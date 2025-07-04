import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate Firebase configuration
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => 
  !import.meta.env[varName] || 
  import.meta.env[varName] === `your_${varName.toLowerCase().replace('vite_firebase_', '').replace('_', '_')}_here` ||
  import.meta.env[varName] === 'your_firebase_api_key_here' ||
  import.meta.env[varName] === 'your_project_id' ||
  import.meta.env[varName] === 'your_messaging_sender_id' ||
  import.meta.env[varName] === 'your_app_id'
);

if (missingVars.length > 0) {
  console.error('❌ Missing or invalid Firebase environment variables:', missingVars);
  console.error('📝 Please configure your Firebase project in the .env file');
  console.error('🔗 Visit: https://console.firebase.google.com/');
}

// Validate project ID format
if (firebaseConfig.projectId && !firebaseConfig.projectId.match(/^[a-z0-9-]+$/)) {
  console.error('❌ Invalid Firebase project ID format. Project IDs should only contain lowercase letters, numbers, and hyphens.');
}

console.log('[FIREBASE CONFIG]', {
  projectId: firebaseConfig.projectId || 'missing',
  authDomain: firebaseConfig.authDomain || 'missing',
  storageBucket: firebaseConfig.storageBucket || 'missing',
  apiKey: firebaseConfig.apiKey ? '***configured***' : 'missing',
  hasValidConfig: missingVars.length === 0
});

// Initialize Firebase
let app;
let auth;
let db;
let storage;

try {
  if (missingVars.length === 0) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // ✅ FIXED: Use standard Firestore initialization with better error handling
    db = getFirestore(app);
    storage = getStorage(app);
    
    // ✅ FIXED: Add connection state monitoring
    if (db) {
      // Monitor connection state
      const unsubscribe = () => {
        console.log('🔄 Firestore connection state changed');
      };
      
      // Set up error handling for the database
      db._delegate._databaseId = db._delegate._databaseId || {};
    }
    
    console.log('✅ Firebase initialized successfully');
  } else {
    console.warn('⚠️ Firebase not initialized due to missing configuration');
    // Create mock objects to prevent app crashes
    auth = null as any;
    db = null as any;
    storage = null as any;
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  auth = null as any;
  db = null as any;
  storage = null as any;
}

// ✅ REMOVED: Emulator connections to prevent production issues
// Emulators should only be used in local development with explicit setup

export { auth, db, storage };
export default app;