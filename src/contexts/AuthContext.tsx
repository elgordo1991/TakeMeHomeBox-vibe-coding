import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase.config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
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
  loginWithGoogle: (credential: string) => Promise<void>;
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

  // Create user profile in Firestore
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

    try {
      // Save to Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
      console.log('✅ User profile created in Firestore');
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
    }

    return userProfile;
  };

  // Load user profile from Firestore
  const loadUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        // Update last active
        await updateDoc(doc(db, 'users', userId), {
          lastActive: new Date().toISOString()
        });
        return { ...userData, lastActive: new Date().toISOString() };
      }
      return null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      // Load user profile
      let profile = await loadUserProfile(firebaseUser.uid);
      
      if (!profile) {
        profile = await createUserProfile(firebaseUser);
      }
      
      setUser(profile);
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (userData: Partial<User> & { password: string }) => {
    try {
      if (!userData.email || !userData.password) {
        throw new Error('Email and password are required');
      }

      const result = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      const firebaseUser = result.user;
      
      // Update Firebase profile with username
      if (userData.username) {
        await updateFirebaseProfile(firebaseUser, {
          displayName: userData.username
        });
      }
      
      // Create and save user profile
      const profile = await createUserProfile(firebaseUser, userData);
      setUser(profile);
    } catch (error: any) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const provider = GoogleAuthProvider.credential(credential);
      const result = await signInWithCredential(auth, provider);
      const firebaseUser = result.user;
      
      // Load existing profile or create new one
      let profile = await loadUserProfile(firebaseUser.uid);
      
      if (!profile) {
        // Create new profile for Google user
        profile = await createUserProfile(firebaseUser);
      }
      
      setUser(profile);
    } catch (error: any) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (user) {
      try {
        const updatedUser = {
          ...user,
          ...updates,
          lastActive: new Date().toISOString(),
        };
        
        // Update in Firestore
        await updateDoc(doc(db, 'users', user.uid), updatedUser);
        setUser(updatedUser);
      } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};