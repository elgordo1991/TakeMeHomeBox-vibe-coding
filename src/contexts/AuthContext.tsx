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
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: Partial<User> & { password: string }) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Get stored user data from localStorage or create new profile
        const storedUserData = localStorage.getItem(`user_${firebaseUser.uid}`);
        
        let profile: User;
        if (storedUserData) {
          profile = JSON.parse(storedUserData);
        } else {
          profile = {
            id: firebaseUser.uid,
            username: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
            email: firebaseUser.email || '',
            bio: '',
            rating: 5.0,
            itemsGiven: 0,
            itemsTaken: 0,
            avatar: firebaseUser.photoURL || '',
          };
          // Store new user data
          localStorage.setItem(`user_${firebaseUser.uid}`, JSON.stringify(profile));
        }
        
        setUser(profile);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;
    
    // Get stored user data
    const storedUserData = localStorage.getItem(`user_${firebaseUser.uid}`);
    let profile: User;
    
    if (storedUserData) {
      profile = JSON.parse(storedUserData);
    } else {
      profile = {
        id: firebaseUser.uid,
        username: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
        email: firebaseUser.email!,
        bio: '',
        rating: 5.0,
        itemsGiven: 0,
        itemsTaken: 0,
        avatar: firebaseUser.photoURL || '',
      };
      localStorage.setItem(`user_${firebaseUser.uid}`, JSON.stringify(profile));
    }
    
    setUser(profile);
  };

  const signup = async (userData: Partial<User> & { password: string }) => {
    const result = await createUserWithEmailAndPassword(auth, userData.email!, userData.password);
    const firebaseUser = result.user;
    
    // Update Firebase profile with username
    if (userData.username) {
      await updateFirebaseProfile(firebaseUser, {
        displayName: userData.username
      });
    }
    
    const profile: User = {
      id: firebaseUser.uid,
      username: userData.username || firebaseUser.email!.split('@')[0],
      email: firebaseUser.email!,
      bio: userData.bio || '',
      rating: 5.0,
      itemsGiven: 0,
      itemsTaken: 0,
      avatar: '',
    };
    
    // Store user data
    localStorage.setItem(`user_${firebaseUser.uid}`, JSON.stringify(profile));
    setUser(profile);
  };

  const loginWithGoogle = async (credential: string) => {
    const provider = GoogleAuthProvider.credential(credential);
    const result = await signInWithCredential(auth, provider);
    const firebaseUser = result.user;
    
    // Check if user data exists
    const storedUserData = localStorage.getItem(`user_${firebaseUser.uid}`);
    let profile: User;
    
    if (storedUserData) {
      profile = JSON.parse(storedUserData);
    } else {
      profile = {
        id: firebaseUser.uid,
        username: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
        email: firebaseUser.email!,
        bio: '',
        rating: 5.0,
        itemsGiven: 0,
        itemsTaken: 0,
        avatar: firebaseUser.photoURL || '',
      };
      localStorage.setItem(`user_${firebaseUser.uid}`, JSON.stringify(profile));
    }
    
    setUser(profile);
  };

  const logout = () => {
    signOut(auth);
    setUser(null);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      // Update stored data
      localStorage.setItem(`user_${user.id}`, JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, loginWithGoogle, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};