import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AuthService } from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Web storage helper
const webStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
    return Promise.resolve();
  },
};

// Choose storage based on platform
const storage = Platform.OS === 'web' ? webStorage : AsyncStorage;

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}



export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getItem('accessToken');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.warn('Auth check failed', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
  try {
    const response = await AuthService.login({ username, password });

    if (response.role !== 'ADMIN') {
      throw new Error('NOT_ADMIN');
    }

    await storage.setItem('accessToken', response.accessToken);
    await storage.setItem('refreshToken', response.refreshToken);

    setIsAuthenticated(true);

  } catch (error: any) {
  console.log('FULL ERROR:', error);

  // 👉 lấy message từ backend
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.localizedMessage ||
    error?.message ||
    'Đăng nhập thất bại';

  throw new Error(message);
}
};

  const logout = async () => {
    const refreshToken = await storage.getItem('refreshToken');
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }
    await storage.removeItem('accessToken');
    await storage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};