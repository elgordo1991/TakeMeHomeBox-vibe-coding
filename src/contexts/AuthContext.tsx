import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase.config';
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

interface User {
  id: string;
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
  updateProfile: (updates: Partial<User>) => void;
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

  // Create user profile from Firebase user
  const createUserProfile = (firebaseUser: FirebaseUser, additionalData?: Partial<User>): User => {
    const now = new Date().toISOString();
    
    return {
      id: firebaseUser.uid,
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
  };

  // Save user profile to localStorage
  const saveUserProfile = (userProfile: User) => {
    localStorage.setItem(`user_${userProfile.id}`, JSON.stringify(userProfile));
    localStorage.setItem('currentUser', JSON.stringify(userProfile));
  };

  // Load user profile from localStorage
  const loadUserProfile = (userId: string): User | null => {
    try {
      const storedData = localStorage.getItem(`user_${userId}`);
      return storedData ? JSON.parse(storedData) : null;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  // Update last active timestamp
  const updateLastActive = (userProfile: User) => {
    const updatedProfile = {
      ...userProfile,
      lastActive: new Date().toISOString(),
    };
    saveUserProfile(updatedProfile);
    return updatedProfile;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Load existing profile or create new one
        let profile = loadUserProfile(firebaseUser.uid);
        
        if (profile) {
          // Update existing profile with latest Firebase data
          profile = {
            ...profile,
            email: firebaseUser.email || profile.email,
            avatar: firebaseUser.photoURL || profile.avatar,
          };
          profile = updateLastActive(profile);
        } else {
          // Create new profile
          profile = createUserProfile(firebaseUser);
          saveUserProfile(profile);
        }
        
        setUser(profile);
      } else {
        setUser(null);
        localStorage.removeItem('currentUser');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      // Load or create user profile
      let profile = loadUserProfile(firebaseUser.uid);
      
      if (profile) {
        profile = updateLastActive(profile);
      } else {
        profile = createUserProfile(firebaseUser);
        saveUserProfile(profile);
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
      const profile = createUserProfile(firebaseUser, userData);
      saveUserProfile(profile);
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
      let profile = loadUserProfile(firebaseUser.uid);
      
      if (profile) {
        // Update existing profile
        profile = {
          ...profile,
          email: firebaseUser.email || profile.email,
          avatar: firebaseUser.photoURL || profile.avatar,
        };
        profile = updateLastActive(profile);
      } else {
        // Create new profile for Google user
        profile = createUserProfile(firebaseUser);
        saveUserProfile(profile);
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
      localStorage.removeItem('currentUser');
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = {
        ...user,
        ...updates,
        lastActive: new Date().toISOString(),
      };
      setUser(updatedUser);
      saveUserProfile(updatedUser);
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