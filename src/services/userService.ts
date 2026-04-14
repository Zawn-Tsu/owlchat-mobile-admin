import { apiClient } from './apiClient';
import { Account, UserProfile, PaginatedResponse } from '../types/api';

export class UserService {
  // Accounts
  static async getAccounts(params?: { keywords?: string; page?: number; size?: number; status?: number; ascSort?: boolean }): Promise<PaginatedResponse<Account>> {
    const response = await apiClient.user.get('/account', { params });
    return response.data;
  }

  static async createAccount(account: { role: string; username: string; password: string }): Promise<Account> {
    const response = await apiClient.user.post('/account', account);
    return response.data;
  }

  static async getAccount(id: string): Promise<Account> {
    const response = await apiClient.user.get(`/account/${id}`);
    return response.data;
  }

  static async updateAccount(id: string, account: { role: string; username: string; password: string }): Promise<Account> {
    const response = await apiClient.user.put(`/account/${id}`, account);
    return response.data;
  }

  static async deleteAccount(id: string): Promise<void> {
    await apiClient.user.delete(`/account/${id}`);
  }

  static async updateAccountStatus(id: string, status: boolean): Promise<void> {
    await apiClient.user.patch(`/account/${id}/status/${status}`);
  }

  // User Profiles
  static async getUsers(params?: { keywords?: string; page?: number; size?: number; gender?: number; dateOfBirthStart?: string; dateOfBirthEnd?: string; ascSort?: boolean }): Promise<PaginatedResponse<UserProfile>> {
    const response = await apiClient.user.get('/user', { params });
    return response.data;
  }

  static async createUserWithAccount(data: { account: { role: string; username: string; password: string }; userProfile: { name: string; gender: boolean; dateOfBirth: string; email: string; phoneNumber: string } }): Promise<UserProfile> {
    const response = await apiClient.user.post('/user', data);
    return response.data;
  }

  static async getUser(id: string): Promise<UserProfile> {
    const response = await apiClient.user.get(`/user/${id}`);
    return response.data;
  }

  static async updateUser(id: string, user: { name: string; gender: boolean; dateOfBirth: string; email: string; phoneNumber: string }): Promise<UserProfile> {
    const response = await apiClient.user.put(`/user/${id}`, user);
    return response.data;
  }

  static async deleteUser(id: string): Promise<void> {
    await apiClient.user.delete(`/user/${id}`);
  }

  static async uploadAvatar(id: string, file: FormData): Promise<void> {
    await apiClient.user.post(`/user/${id}/avatar/upload`, file, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  static async getAvatar(id: string): Promise<Blob> {
    const response = await apiClient.user.get(`/user/${id}/avatar`, { responseType: 'blob' });
    return response.data;
  }

  static async getCurrentUser(): Promise<UserProfile> {
    const response = await apiClient.user.get('/user/me');
    return response.data;
  }
}