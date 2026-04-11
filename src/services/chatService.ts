import { apiClient } from './apiClient';
import { Chat, Member, Message, PaginatedResponse } from '../types/api';

export class ChatService {
  // Chats
  static async getChats(params?: { keywords?: string; page?: number; size?: number; ascSort?: boolean; status?: boolean; type?: string; initiatorId?: string; createdDateStart?: string; createdDateEnd?: string }): Promise<PaginatedResponse<Chat>> {
    const response = await apiClient.chat.get('/admin/chat', { params });
    return response.data;
  }

  static async createChat(data: { type: string; name: string; initiatorId: string }): Promise<Chat> {
    const response = await apiClient.chat.post('/admin/chat', data);
    return response.data;
  }

  static async getChat(chatId: string): Promise<Chat> {
    const response = await apiClient.chat.get(`/admin/chat/${chatId}`);
    return response.data;
  }

  static async updateChat(chatId: string, data: { type: string; name: string; initiatorId: string }): Promise<Chat> {
    const response = await apiClient.chat.put(`/admin/chat/${chatId}`, data);
    return response.data;
  }

  static async deleteChat(chatId: string): Promise<void> {
    await apiClient.chat.delete(`/admin/chat/${chatId}`);
  }

  static async toggleChatStatus(chatId: string, status: boolean): Promise<void> {
    await apiClient.chat.patch(`/admin/chat/${chatId}/status`, status);
  }

  // Members
  static async getMembers(): Promise<Member[]> {
    const response = await apiClient.chat.get('/admin/member');
    return response.data;
  }

  static async addMember(data: { memberId: string; chatId: string; role: string; nickname?: string; inviterId: string }): Promise<Member> {
    const response = await apiClient.chat.post('/admin/member', data);
    return response.data;
  }

  static async updateMember(memberId: string, chatId: string, data: { memberId: string; chatId: string; role: string; nickname?: string; inviterId: string }): Promise<Member> {
    const response = await apiClient.chat.put(`/admin/member/${memberId}/chat/${chatId}`, data);
    return response.data;
  }

  static async deleteMember(memberId: string, chatId: string): Promise<void> {
    await apiClient.chat.delete(`/admin/member/${memberId}/chat/${chatId}`);
  }

  static async updateMemberRole(memberId: string, chatId: string, role: string): Promise<void> {
    await apiClient.chat.patch(`/admin/member/${memberId}/chat/${chatId}/role`, { role });
  }

  static async updateMemberNickname(memberId: string, chatId: string, nickname: string): Promise<void> {
    await apiClient.chat.patch(`/admin/member/${memberId}/chat/${chatId}/nickname`, { nickname });
  }

  // Messages
  static async getMessages(params?: { keywords?: string; page?: number; size?: number; ascSort?: boolean; status?: boolean; state?: string; type?: string; sentDateStart?: string; sentDateEnd?: string }): Promise<PaginatedResponse<Message>> {
    const response = await apiClient.chat.get('/admin/message', { params });
    return response.data;
  }

  static async sendMessage(data: { chatId: string; content: string; senderId: string }): Promise<Message> {
    const response = await apiClient.chat.post('/admin/message', data);
    return response.data;
  }

  static async getMessage(messageId: string): Promise<Message> {
    const response = await apiClient.chat.get(`/admin/message/${messageId}`);
    return response.data;
  }

  static async editMessage(messageId: string, content: string): Promise<void> {
    await apiClient.chat.put(`/admin/message/${messageId}/edit`, { content });
  }

  static async deleteMessage(messageId: string): Promise<void> {
    await apiClient.chat.delete(`/admin/message/${messageId}`);
  }

  static async softDeleteMessage(messageId: string): Promise<void> {
    await apiClient.chat.delete(`/admin/message/${messageId}/remove`);
  }

  static async activateMessage(messageId: string): Promise<void> {
    await apiClient.chat.patch(`/admin/message/${messageId}/activate`);
  }

  static async uploadMessageResource(chatId: string, senderId: string, type: string, file: FormData): Promise<void> {
    await apiClient.chat.post('/admin/message/resource/upload', file, {
      headers: { chatId, senderId, type, 'Content-Type': 'multipart/form-data' }
    });
  }

  static async getMessageResource(messageId: string): Promise<Blob> {
    const response = await apiClient.chat.get(`/admin/message/${messageId}/resource`, { responseType: 'blob' });
    return response.data;
  }
}