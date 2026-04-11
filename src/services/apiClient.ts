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
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      });
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