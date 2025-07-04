import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase.config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

interface User {
  id: string;
  uid: string;
  username: string;
  email: string;
  bio?: string;
  rating: number;
  itemsGiven: number;
  itemsTaken: number;
  avatar?: string;
  createdAt: string;
  lastActive: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: Partial<User> & { password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if Firebase is configured
  const isFirebaseConfigured = () => {
    return auth && db;
  };

  // ✅ OPTIMIZED: Batch user profile operations
  const createUserProfile = async (firebaseUser: FirebaseUser, additionalData?: Partial<User>): Promise<User> => {
    const now = new Date().toISOString();
    
    const userProfile: User = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      username: additionalData?.username || firebaseUser.displayName || firebaseUser.email!.split('@')[0],
      email: firebaseUser.email || '',
      bio: additionalData?.bio || '',
      rating: 5.0,
      itemsGiven: 0,
      itemsTaken: 0,
      avatar: firebaseUser.photoURL || '',
      createdAt: now,
      lastActive: now,
      ...additionalData,
    };

    if (isFirebaseConfigured()) {
      try {
        // ✅ OPTIMIZED: Use merge option to avoid overwriting existing data
        await setDoc(doc(db, 'users', firebaseUser.uid), userProfile, { merge: true });
        console.log('✅ User profile created/updated in Firestore');
      } catch (error) {
        console.error('❌ Error creating user profile:', error);
        // Continue without Firestore if it fails
      }
    } else {
      console.warn('⚠️ Firebase not configured, storing user profile locally');
      // Store locally as fallback
      localStorage.setItem(`user_${firebaseUser.uid}`, JSON.stringify(userProfile));
    }

    return userProfile;
  };

  // ✅ OPTIMIZED: Cache user profiles and reduce Firestore calls
  const loadUserProfile = async (userId: string): Promise<User | null> => {
    // First check memory cache
    const memoryCache = sessionStorage.getItem(`user_profile_${userId}`);
    if (memoryCache) {
      try {
        const cached = JSON.parse(memoryCache);
        // Use cache if less than 5 minutes old
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
          console.log('📦 Using cached user profile');
          return { ...cached.data, lastActive: new Date().toISOString() };
        }
      } catch (error) {
        console.warn('Failed to parse cached user profile');
      }
    }

    if (isFirebaseConfigured()) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          
          // ✅ OPTIMIZED: Update last active in background, don't wait
          updateDoc(doc(db, 'users', userId), {
            lastActive: new Date().toISOString()
          }).catch(console.error);
          
          const profileData = { ...userData, lastActive: new Date().toISOString() };
          
          // Cache the profile
          sessionStorage.setItem(`user_profile_${userId}`, JSON.stringify({
            data: profileData,
            timestamp: Date.now()
          }));
          
          return profileData;
        }
      } catch (error) {
        console.error('Error loading user profile from Firestore:', error);
        // Fall back to localStorage
      }
    }
    
    // Fallback to localStorage
    try {
      const storedData = localStorage.getItem(`user_${userId}`);
      if (storedData) {
        const userData = JSON.parse(storedData);
        userData.lastActive = new Date().toISOString();
        localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
        return userData;
      }
    } catch (error) {
      console.error('Error loading user profile from localStorage:', error);
    }
    
    return null;
  };

  // ✅ OPTIMIZED: Reduce auth state change processing
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      console.warn('⚠️ Firebase not configured, authentication disabled');
      setLoading(false);
      return;
    }

    let isProcessing = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isProcessing) return;
      isProcessing = true;

      if (firebaseUser) {
        try {
          // Load existing profile or create new one
          let profile = await loadUserProfile(firebaseUser.uid);
          
          if (!profile) {
            // Create new profile
            profile = await createUserProfile(firebaseUser);
          }
          
          setUser(profile);
        } catch (error) {
          console.error('Error handling auth state change:', error);
          setUser(null);
        }
      } else {
        setUser(null);
        // Clear cached profiles on logout
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('user_profile_')) {
            sessionStorage.removeItem(key);
          }
        });
      }
      
      setLoading(false);
      isProcessing = false;
    });

    return () => unsubscribe();
  }, []);

  // ✅ OPTIMIZED: Faster login with reduced database calls
  const login = async (email: string, password: string) => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. Please check your environment variables.');
    }

    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      // Load user profile (will use cache if available)
      let profile = await loadUserProfile(firebaseUser.uid);
      
      if (!profile) {
        profile = await createUserProfile(firebaseUser);
      }
      
      setUser(profile);
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ OPTIMIZED: Faster signup with parallel operations
  const signup = async (userData: Partial<User> & { password: string }) => {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. Please check your environment variables.');
    }

    try {
      setLoading(true);
      
      if (!userData.email || !userData.password) {
        throw new Error('Email and password are required');
      }

      const result = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = result.user;
      
      // ✅ OPTIMIZED: Update Firebase profile and create user profile in parallel
      const updateProfilePromise = userData.username ? 
        updateFirebaseProfile(firebaseUser, { displayName: userData.username }) : 
        Promise.resolve();
      
      const createProfilePromise = createUserProfile(firebaseUser, userData);
      
      const [, profile] = await Promise.all([updateProfilePromise, createProfilePromise]);
      
      setUser(profile);
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (!isFirebaseConfigured()) {
      setUser(null);
      return;
    }

    try {
      await signOut(auth);
      setUser(null);
      // Clear cached profiles
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('user_profile_')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // ✅ OPTIMIZED: Faster profile updates with optimistic UI
  const updateProfile = async (updates: Partial<User>) => {
    if (user) {
      const updatedUser = {
        ...user,
        ...updates,
        lastActive: new Date().toISOString(),
      };
      
      // ✅ OPTIMIZED: Update UI immediately (optimistic update)
      setUser(updatedUser);
      
      // Update cache immediately
      sessionStorage.setItem(`user_profile_${user.uid}`, JSON.stringify({
        data: updatedUser,
        timestamp: Date.now()
      }));
      
      if (isFirebaseConfigured()) {
        try {
          // Update in Firestore in background
          await updateDoc(doc(db, 'users', user.uid), updatedUser);
        } catch (error) {
          console.error('Error updating profile in Firestore:', error);
          // Revert optimistic update on error
          setUser(user);
          sessionStorage.setItem(`user_profile_${user.uid}`, JSON.stringify({
            data: user,
            timestamp: Date.now()
          }));
          throw error;
        }
      }
      
      // Fallback to localStorage
      try {
        localStorage.setItem(`user_${user.uid}`, JSON.stringify(updatedUser));
      } catch (error) {
        console.error('Error updating profile in localStorage:', error);
      }
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};