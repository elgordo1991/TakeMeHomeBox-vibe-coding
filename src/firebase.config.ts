import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
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
    storage = getStorage(app);
    
    // ✅ FIXED: Use regular Firestore for production to avoid connection issues
    try {
      // Only use persistent cache in development
      if (import.meta.env.DEV) {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          })
        });
        console.log('✅ Firestore initialized with persistent cache (development)');
      } else {
        // Use regular Firestore in production for better stability
        db = getFirestore(app);
        console.log('✅ Firestore initialized (production)');
      }
    } catch (error) {
      // Fallback to regular Firestore if persistent cache fails
      console.warn('⚠️ Persistent cache failed, using regular Firestore:', error);
      db = getFirestore(app);
      console.log('✅ Firestore initialized with fallback');
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

// Optional: Connect to emulators in development
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' && import.meta.env.DEV && auth && db && storage) {
  try {
    // Connect to Auth emulator
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, "http://localhost:9099");
      console.log("🔧 Connected to Firebase Auth emulator");
    }
    
    // Connect to Firestore emulator
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log("🔧 Connected to Firestore emulator");
    
    // Connect to Storage emulator
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log("🔧 Connected to Storage emulator");
  } catch (error) {
    console.warn("⚠️ Failed to connect to Firebase emulators:", error);
  }
}

export { auth, db, storage };
export default app;