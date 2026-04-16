import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AuthService } from '../services/authService';
import { UserService } from '../services/userService';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const savedUserId = await AsyncStorage.getItem('userId');
      setIsAuthenticated(!!token);
      setUserId(savedUserId || null);
    } catch (error) {
      console.warn('Auth check failed', error);
      setIsAuthenticated(false);
      setUserId(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await AuthService.login({ username, password });

      if (response.role !== 'ADMIN') {
        throw new Error('Not an admin account');
      }

      await AsyncStorage.setItem('accessToken', response.accessToken);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);

      // Gọi API để lấy profile của user hiện tại (admin)
      try {
        const currentUser = await UserService.getCurrentUser();
        await AsyncStorage.setItem('userId', currentUser.id);
        setUserId(currentUser.id);
      } catch (error) {
        console.warn('Failed to fetch current user:', error);
        // Fallback nếu /user/me không hoạt động
        const id = response.userId || response.id;
        if (id) {
          await AsyncStorage.setItem('userId', id);
          setUserId(id);
        }
      }

      setIsAuthenticated(true);

    } catch (error: any) {
      console.log('FULL ERROR:', error);
      console.log('Error response data:', error?.response?.data);
      console.log('Error response status:', error?.response?.status);

      // 👉 Lấy message từ backend
      // Backend trả về plain text, không phải JSON
      let message = '';
      
      if (error?.response?.data) {
        // Nếu response.data là string (plain text)
        if (typeof error.response.data === 'string') {
          message = error.response.data;
        }
        // Nếu là object JSON
        else if (typeof error.response.data === 'object') {
          message = error.response.data?.message || 
                   error.response.data?.localizedMessage || 
                   JSON.stringify(error.response.data);
        }
      }
      
      // Nếu là custom error từ role check
      if (error.message && error.message.includes('admin')) {
        message = error.message;
      }
      
      // Fallback
      if (!message) {
        message = error?.message || 'Đăng nhập thất bại';
      }

      console.log('Final message:', message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (refreshToken) {
      await AuthService.logout(refreshToken);
    }
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('userId');
    setIsAuthenticated(false);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userId, login, logout, loading }}>
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