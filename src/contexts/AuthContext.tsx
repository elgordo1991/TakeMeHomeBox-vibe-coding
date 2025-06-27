import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
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
  signup: (userData: Partial<User>) => Promise<void>;
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

  // Watch Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const profile: User = {
          id: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          email: firebaseUser.email || '',
          bio: '',
          rating: 5,
          itemsGiven: 0,
          itemsTaken: 0,
          avatar: firebaseUser.photoURL || '',
        };
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
    setUser({
      id: firebaseUser.uid,
      username: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
      email: firebaseUser.email!,
      bio: '',
      rating: 5,
      itemsGiven: 0,
      itemsTaken: 0,
      avatar: firebaseUser.photoURL || '',
    });
  };

  const signup = async (userData: Partial<User>) => {
    const result = await createUserWithEmailAndPassword(auth, userData.email!, userData.password!);
    const firebaseUser = result.user;
    setUser({
      id: firebaseUser.uid,
      username: userData.username || firebaseUser.email!.split('@')[0],
      email: firebaseUser.email!,
      bio: userData.bio || '',
      rating: 5,
      itemsGiven: 0,
      itemsTaken: 0,
      avatar: '',
    });
  };

  const loginWithGoogle = async (credential: string) => {
    const provider = GoogleAuthProvider.credential(credential);
    const result = await signInWithCredential(auth, provider);
    const firebaseUser = result.user;

    setUser({
      id: firebaseUser.uid,
      username: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
      email: firebaseUser.email!,
      bio: '',
      rating: 5,
      itemsGiven: 0,
      itemsTaken: 0,
      avatar: firebaseUser.photoURL || '',
    });
  };

  const logout = () => {
    signOut(auth);
    setUser(null);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, loginWithGoogle, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};