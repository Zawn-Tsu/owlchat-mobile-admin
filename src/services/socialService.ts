import { apiClient } from './apiClient';
import { FriendRequest, Friendship, Block, PaginatedResponse } from '../types/api';

export class SocialService {
  // Friend Requests
  static async getFriendRequests(params?: { requesterId?: string; status?: string; keywords?: string; page?: number; size?: number; ascSort?: boolean; createdDateStart?: string; createdDateEnd?: string }): Promise<PaginatedResponse<FriendRequest>> {
    const response = await apiClient.social.get('/admin/friend-request', { params });
    return response.data;
  }

  static async createFriendRequest(data: { senderId: string; receiverId: string }): Promise<FriendRequest> {
    const response = await apiClient.social.post('/admin/friend-request', data);
    return response.data;
  }

  static async deleteFriendRequest(id: string): Promise<void> {
    await apiClient.social.delete(`/admin/friend-request/${id}`);
  }

  static async respondFriendRequest(id: string, response: 'ACCEPTED' | 'REJECTED'): Promise<void> {
    await apiClient.social.patch(`/admin/friend-request/${id}/response`, { response });
  }

  // Friendships
  static async getFriendships(): Promise<Friendship[]> {
    const response = await apiClient.social.get('/admin/friendship');
    return response.data;
  }

  static async createFriendship(data: { firstUserId: string; secondUserId: string }): Promise<Friendship> {
    const response = await apiClient.social.post('/admin/friendship', data);
    return response.data;
  }

  static async deleteFriendship(id: string): Promise<void> {
    await apiClient.social.delete(`/admin/friendship/${id}`);
  }

  // Blocks
  static async getBlocks(params?: { page?: number; size?: number; ascSort?: boolean; createdDateStart?: string; createdDateEnd?: string }): Promise<PaginatedResponse<Block>> {
    const response = await apiClient.social.get('/admin/block', { params });
    return response.data;
  }

  static async createBlock(data: { blockerId: string; blockedId: string }): Promise<Block> {
    const response = await apiClient.social.post('/admin/block', data);
    return response.data;
  }

  static async deleteBlock(id: string): Promise<void> {
    await apiClient.social.delete(`/admin/block/${id}`);
  }
}