import React, { createContext, useContext, useState } from 'react';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Mock login - in real app, this would call your API
    const mockUser: User = {
      id: '1',
      username: 'EcoWarrior',
      email,
      bio: 'Love sharing and reducing waste!',
      rating: 4.8,
      itemsGiven: 12,
      itemsTaken: 8,
    };
    setUser(mockUser);
  };

  const signup = async (userData: Partial<User>) => {
    // Mock signup - in real app, this would call your API
    const newUser: User = {
      id: Date.now().toString(),
      username: userData.username || 'NewUser',
      email: userData.email || '',
      bio: userData.bio || '',
      rating: 5.0,
      itemsGiven: 0,
      itemsTaken: 0,
    };
    setUser(newUser);
  };

  const loginWithGoogle = async (credential: string) => {
  try {
    if (!credential) {
      throw new Error("Missing Google credential");
    }

    const payload = JSON.parse(atob(credential.split('.')[1]));

    if (!payload || !payload.sub || !payload.email) {
      console.error("Invalid Google payload:", payload);
      return;
    }

    const googleUser: User = {
      id: payload.sub,
      username: payload.name || payload.email.split('@')[0],
      email: payload.email,
      bio: '',
      rating: 5.0,
      itemsGiven: 0,
      itemsTaken: 0,
      avatar: payload.picture || '',
    };

    console.log("✅ Google user created:", googleUser);
    setUser(googleUser);
  } catch (error) {
    console.error("❌ Error in loginWithGoogle:", error);
    throw error;
  }
};
    try {
      // Decode the JWT token to get user info
      const payload = JSON.parse(atob(credential.split('.')[1]));
      
      const googleUser: User = {
        id: payload.sub,
        username: payload.name || payload.email.split('@')[0],
        email: payload.email,
        bio: '',
        rating: 5.0,
        itemsGiven: 0,
        itemsTaken: 0,
        avatar: payload.picture,
      };

      console.log("Google payload:", payload);
console.log("User created:", googleUser);
      setUser(googleUser);
    } catch (error) {
      console.error('Error processing Google sign-in:', error);
      throw error;
    }
  };

  const logout = () => {
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