  import { apiClient } from './apiClient';
  import { LoginRequest, LoginResponse, RefreshRequest } from '../types/api';

  export class AuthService {
    static async login(credentials: LoginRequest): Promise<LoginResponse> {
      console.log('AuthService.login called with:', credentials);
      const response = await apiClient.user.post('/auth/login', credentials);
      console.log('AuthService.login response:', response.data);
      return response.data;
    }

    static async refreshToken(refreshData: RefreshRequest): Promise<LoginResponse> {
      const response = await apiClient.user.post('/auth/refresh', refreshData);
      return response.data;
    }

    static async logout(refreshToken: string): Promise<void> {
      await apiClient.user.post('/auth/logout', { refreshToken });
    }
  }