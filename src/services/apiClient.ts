import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

const API_BASE = getEnv('EXPO_PUBLIC_API_BASE_URL');
const USER_PREFIX = getEnv('EXPO_PUBLIC_USER_SERVICE_PREFIX');
const SOCIAL_PREFIX = getEnv('EXPO_PUBLIC_SOCIAL_SERVICE_PREFIX');
const CHAT_PREFIX = getEnv('EXPO_PUBLIC_CHAT_SERVICE_PREFIX');

class ApiClient {
  private userClient: AxiosInstance;
  private socialClient: AxiosInstance;
  private chatClient: AxiosInstance;

  constructor() {
    console.log('API BASE:', API_BASE);

    this.userClient = axios.create({ baseURL: API_BASE + USER_PREFIX });
    this.socialClient = axios.create({ baseURL: API_BASE + SOCIAL_PREFIX });
    this.chatClient = axios.create({ baseURL: API_BASE + CHAT_PREFIX });

    [this.userClient, this.socialClient, this.chatClient].forEach(client => {
      client.interceptors.request.use(async config => {
        const token = await AsyncStorage.getItem('accessToken');
        console.log('🔑 Token from storage:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ Authorization header set');
        } else {
          console.warn('⚠️ NO TOKEN IN STORAGE!');
        }
        return config;
      });

      client.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config;
          if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
              const refreshToken = await AsyncStorage.getItem('refreshToken');
              if (refreshToken) {
                console.log('🔄 Attempting to refresh token...');
                const response = await axios.post(`${API_BASE}${USER_PREFIX}/auth/refresh`, { refreshToken });
                const { accessToken, refreshToken: newRefreshToken } = response.data;
                
                await AsyncStorage.setItem('accessToken', accessToken);
                await AsyncStorage.setItem('refreshToken', newRefreshToken);
                console.log('✅ Token refreshed successfully');
                
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return client(originalRequest);
              }
            } catch (refreshError) {
              console.error('❌ Refresh token failed:', refreshError);
              await AsyncStorage.removeItem('accessToken');
              await AsyncStorage.removeItem('refreshToken');
              await AsyncStorage.removeItem('userId');
              // On web, reloading the page forces a re-render of AuthContext logic which redirects to login.
              if (typeof window !== 'undefined' && window.location) {
                window.location.reload();
              }
            }
          }
          return Promise.reject(error);
        }
      );
    });
  }

  get user() {
    return this.userClient;
  }
  get social() {
    return this.socialClient;
  }
  get chat() {
    return this.chatClient;
  }
}

export const apiClient = new ApiClient();