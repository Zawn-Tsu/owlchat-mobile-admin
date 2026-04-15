import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Image, FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { UserService } from '../services/userService';
import { SocialService } from '../services/socialService';
import { ChatService } from '../services/chatService';

interface TabType {
  key: 'profile' | 'friends' | 'blocks' | 'chats' | 'requests';
  label: string;
  icon: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  gender: boolean;
  dateOfBirth: string;
}

interface Friend {
  id: string;
  firstUserId: string;
  secondUserId: string;
  createdDate: string;
}

interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdDate: string;
}

interface Chat {
  id: string;
  name: string;
  type: string;
  status: boolean;
  initiatorId: string;
  createdDate: string;
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdDate: string;
}

const UserDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const userId = (route.params as any)?.userId;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType['key']>('profile');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);

  const tabs: TabType[] = [
    { key: 'profile', label: 'Hồ sơ', icon: '👤' },
    { key: 'friends', label: 'Bạn bè', icon: '👥' },
    { key: 'blocks', label: 'Chặn', icon: '🚫' },
    { key: 'chats', label: 'Chat', icon: '💬' },
    { key: 'requests', label: 'Lời mời', icon: '🤝' },
  ];

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userRes, friendsRes, blocksRes, chatsRes, reqRes] = await Promise.all([
        UserService.getUser(userId),
        SocialService.getFriendships().catch(() => ({ content: [] })),
        SocialService.getBlocks({ size: 100 }).catch(() => ({ content: [] })),
        ChatService.getChats({ keywords: userId, size: 100 }).catch(() => ({ content: [] })),
        SocialService.getFriendRequests({ requesterId: userId, size: 100 }).catch(() => ({ content: [] })),
      ]);

      setUser(userRes);
      setFriends(Array.isArray(friendsRes) ? friendsRes : friendsRes?.content || []);
      setBlocks(Array.isArray(blocksRes) ? blocksRes : blocksRes?.content || []);
      setChats(Array.isArray(chatsRes) ? chatsRes : chatsRes?.content || []);
      setRequests(Array.isArray(reqRes) ? reqRes : reqRes?.content || []);
    } catch (error) {
      console.error('Load user detail error:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin user');
    } finally {
      setLoading(false);
    }
  };

  const renderProfileTab = () => (
    <View style={styles.tabContent}>
      {user && (
        <>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>ID</Text>
              <Text style={styles.value}>{user.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tên</Text>
              <Text style={styles.value}>{user.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Số điện thoại</Text>
              <Text style={styles.value}>{user.phoneNumber || 'Chưa cập nhật'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Giới tính</Text>
              <Text style={styles.value}>{user.gender ? 'Nam' : 'Nữ'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Ngày sinh</Text>
              <Text style={styles.value}>{user.dateOfBirth}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );

  const renderFriendsTab = () => (
    <View style={styles.tabContent}>
      {friends.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Chưa có bạn bè</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.itemIcon}>👤</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>
                  {item.firstUserId === userId ? item.secondUserId : item.firstUserId}
                </Text>
                <Text style={styles.itemSubtitle}>
                  Kết bạn từ {new Date(item.createdDate).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );

  const renderBlocksTab = () => (
    <View style={styles.tabContent}>
      {blocks.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Không chặn ai</Text>
        </View>
      ) : (
        <FlatList
          data={blocks}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.itemIcon}>🚫</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.blockedId}</Text>
                <Text style={styles.itemSubtitle}>
                  Chặn từ {new Date(item.createdDate).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );

  const renderChatsTab = () => (
    <View style={styles.tabContent}>
      {chats.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Chưa tham gia phòng chat</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.itemIcon}>💬</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>
                  Loại: {item.type} • Trạng thái: {item.status ? '✅' : '❌'}
                </Text>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );

  const renderRequestsTab = () => (
    <View style={styles.tabContent}>
      {requests.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Không có lời mời kết bạn</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.itemIcon}>🤝</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>
                  {item.senderId === userId ? `Gửi tới ${item.receiverId}` : `Từ ${item.senderId}`}
                </Text>
                <Text style={styles.itemSubtitle}>
                  Trạng thái: {item.status} • {new Date(item.createdDate).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
        />
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'friends':
        return renderFriendsTab();
      case 'blocks':
        return renderBlocksTab();
      case 'chats':
        return renderChatsTab();
      case 'requests':
        return renderRequestsTab();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết User</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* User Header Card */}
      {user && (
        <View style={styles.userCard}>
          <View style={styles.userCardContent}>
            <View style={styles.userAvatar}>
              <Text style={styles.avatarEmoji}>👤</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userId}>{user.id}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tab Navigation */}
      <FlatList
        horizontal
        data={tabs}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tabButton, activeTab === item.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(item.key)}
          >
            <Text style={styles.tabIcon}>{item.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === item.key && styles.tabLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.key}
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
      />

      {/* Tab Content */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f3f4f6' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { fontSize: 16, color: '#16a34a', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  userCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  userCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  avatarEmoji: { fontSize: 28 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  userId: { fontSize: 12, color: '#6b7280' },
  userEmail: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  tabsContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tabButton: {
    padding: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: { borderBottomColor: '#16a34a' },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  tabLabelActive: { color: '#16a34a', fontWeight: '600' },

  body: { flex: 1, backgroundColor: '#f3f4f6' },

  tabContent: { padding: 16 },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  value: { fontSize: 13, fontWeight: '500', color: '#111827' },

  emptyBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: { fontSize: 14, color: '#9ca3af' },

  listItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  itemIcon: { fontSize: 24 },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  itemSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});

export default UserDetailScreen;
