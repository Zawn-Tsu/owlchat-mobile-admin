export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: string;
  userId?: string;
  id?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface Account {
  id: string;
  username: string;
  role: string;
  status: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  gender: boolean;
  dateOfBirth: string;
  email: string;
  phoneNumber: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdDate: string;
}

export interface Friendship {
  id: string;
  firstUserId: string;
  secondUserId: string;
  createdDate: string;
}

export interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdDate: string;
}

export interface Chat {
  id: string;
  name: string;
  type: string;
  status: boolean;
  initiatorId: string;
  createdDate: string;
}

export interface Member {
  id: string;
  memberId: string;
  chatId: string;
  role: string;
  nickname?: string;
  joinDate: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: string;
  sentDate: string;
  status: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}