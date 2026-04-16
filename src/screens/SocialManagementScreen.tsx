import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, RefreshControl, TextInput,
  Alert, Modal, ScrollView,
} from 'react-native';
import { apiClient } from '../services/apiClient';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
// ─── Types ────────────────────────────────────────────────────────────────────
interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;     // 'PENDING' | 'ACCEPTED' | 'REJECTED'
  createdDate?: string;
  updatedDate?: string;
}

interface Friendship {
  id: string;
  firstUserId: string;
  secondUserId: string;
  createdDate?: string;
}

interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdDate?: string;
}

type TabKey = 'requests' | 'friends' | 'blocks';

// ─── Helper ───────────────────────────────────────────────────────────────────
const extractData = (response: any) => response?.data?.data || response?.data;

// ─── API ──────────────────────────────────────────────────────────────────────
const SocialAPI = {
  // Friend requests
  getFriendRequests: (params: Record<string, any>) =>
    apiClient.social.get('/admin/friend-request', { params }),

  deleteFriendRequest: (id: string) =>
    apiClient.social.delete(`/admin/friend-request/${id}`),

  respondFriendRequest: (id: string, response: 'ACCEPTED' | 'REJECTED') =>
    apiClient.social.patch(`/admin/friend-request/${id}/response`, { response }),

  // Friendships
  getFriendships: (params?: Record<string, any>) =>
    apiClient.social.get('/admin/friendship', { params }),

  deleteFriendship: (id: string) =>
    apiClient.social.delete(`/admin/friendship/${id}`),

  getFriendsByUser: (userId: string) =>
    apiClient.social.get(`/admin/friendship/user/${userId}`),

  // Blocks
  getBlocks: (params: Record<string, any>) =>
    apiClient.social.get('/admin/block', { params }),

  deleteBlock: (id: string) =>
    apiClient.social.delete(`/admin/block/${id}`),

  getBlocksByUser: (userId: string) =>
    apiClient.social.get(`/admin/block/user/${userId}/blocked`),
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const RequestStatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    PENDING:  { bg: '#fef9c3', text: '#854d0e', label: '⏳ Chờ' },
    ACCEPTED: { bg: '#dcfce7', text: '#15803d', label: '✅ Chấp nhận' },
    REJECTED: { bg: '#fee2e2', text: '#dc2626', label: '❌ Từ chối' },
  };
  const c = cfg[status?.toUpperCase()] ?? cfg.PENDING;
  return (
    <View style={[styles.reqBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.reqBadgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const SocialManagementScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('requests');

  // Friend Requests state
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqRefreshing, setReqRefreshing] = useState(false);
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatus, setReqStatus] = useState('');   // '' | 'PENDING' | 'ACCEPTED' | 'REJECTED'
  const [reqPage, setReqPage] = useState(0);
  const [reqHasMore, setReqHasMore] = useState(true);

  // Friendships state
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsRefreshing, setFriendsRefreshing] = useState(false);
  const [friendsPage, setFriendsPage] = useState(0);
  const [friendsHasMore, setFriendsHasMore] = useState(true);

  // Blocks state
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksRefreshing, setBlocksRefreshing] = useState(false);
  const [blocksPage, setBlocksPage] = useState(0);
  const [blocksHasMore, setBlocksHasMore] = useState(true);

  const PAGE_SIZE = 20;

  // Load on tab change
  useEffect(() => {
    if (activeTab === 'requests') loadRequests(0, true);
    if (activeTab === 'friends') loadFriendships(0, true);
    if (activeTab === 'blocks') loadBlocks(0, true);
  }, [activeTab, reqStatus]);

  // ── Friend Requests ────────────────────────────────────────────────────────
  const loadRequests = async (pageNum = 0, reset = false) => {
    if (pageNum === 0) setReqLoading(true);
    try {
      const params: Record<string, any> = { page: pageNum, size: PAGE_SIZE, ascSort: false };
      if (reqStatus) params.status = reqStatus;
      if (reqSearch) params.keywords = reqSearch;
      const res = await SocialAPI.getFriendRequests(params);
      const responseData = extractData(res);
      const data: FriendRequest[] = Array.isArray(responseData) ? responseData : (responseData?.content ?? []);
      if (reset || pageNum === 0) setRequests(data);
      else setRequests(prev => [...prev, ...data]);
      setReqHasMore(data.length === PAGE_SIZE);
      setReqPage(pageNum);
    } catch (e) { console.error(e); }
    finally { setReqLoading(false); setReqRefreshing(false); }
  };

  const handleDeleteRequest = (id: string) => {
    Alert.alert('Xoá lời mời kết bạn', 'Xác nhận xoá?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          try {
            await SocialAPI.deleteFriendRequest(id);
            setRequests(prev => prev.filter(r => r.id !== id));
          } catch { Alert.alert('Lỗi', 'Không thể xoá.'); }
        },
      },
    ]);
  };

  const handleRespondRequest = (id: string, action: 'ACCEPTED' | 'REJECTED') => {
    Alert.alert(
      action === 'ACCEPTED' ? 'Chấp nhận kết bạn' : 'Từ chối kết bạn',
      'Thao tác này sẽ thay đổi trạng thái lời mời.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              await SocialAPI.respondFriendRequest(id, action);
              setRequests(prev =>
                prev.map(r => r.id === id ? { ...r, status: action } : r)
              );
            } catch { Alert.alert('Lỗi', 'Không thể cập nhật.'); }
          },
        },
      ]
    );
  };

  // ── Friendships ────────────────────────────────────────────────────────────
  const loadFriendships = async (pageNum = 0, reset = false) => {
    if (pageNum === 0) setFriendsLoading(true);
    try {
      const res = await SocialAPI.getFriendships({ page: pageNum, size: PAGE_SIZE });
      const responseData = extractData(res);
      const data: Friendship[] = Array.isArray(responseData) ? responseData : (responseData?.content ?? []);
      if (reset || pageNum === 0) setFriends(data);
      else setFriends(prev => [...prev, ...data]);
      setFriendsHasMore(data.length === PAGE_SIZE);
      setFriendsPage(pageNum);
    } catch (e) { console.error(e); }
    finally { setFriendsLoading(false); setFriendsRefreshing(false); }
  };

  const handleDeleteFriendship = (id: string) => {
    Alert.alert('Xoá quan hệ bạn bè', 'Huỷ kết bạn hai người dùng này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive',
        onPress: async () => {
          try {
            await SocialAPI.deleteFriendship(id);
            setFriends(prev => prev.filter(f => f.id !== id));
          } catch { Alert.alert('Lỗi', 'Không thể xoá quan hệ bạn bè.'); }
        },
      },
    ]);
  };

  // ── Blocks ─────────────────────────────────────────────────────────────────
  const loadBlocks = async (pageNum = 0, reset = false) => {
    if (pageNum === 0) setBlocksLoading(true);
    try {
      const res = await SocialAPI.getBlocks({ page: pageNum, size: PAGE_SIZE, ascSort: false });
      const responseData = extractData(res);
      const data: Block[] = Array.isArray(responseData) ? responseData : (responseData?.content ?? []);
      if (reset || pageNum === 0) setBlocks(data);
      else setBlocks(prev => [...prev, ...data]);
      setBlocksHasMore(data.length === PAGE_SIZE);
      setBlocksPage(pageNum);
    } catch (e) { console.error(e); }
    finally { setBlocksLoading(false); setBlocksRefreshing(false); }
  };

  const handleDeleteBlock = (id: string) => {
    Alert.alert('Xoá block', 'Gỡ chặn giữa hai người dùng?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Gỡ chặn', style: 'destructive',
        onPress: async () => {
          try {
            await SocialAPI.deleteBlock(id);
            setBlocks(prev => prev.filter(b => b.id !== id));
          } catch { Alert.alert('Lỗi', 'Không thể gỡ chặn.'); }
        },
      },
    ]);
  };

  const formatDate = (dateStr?: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString('vi-VN') : '—';

  // ── Renders ────────────────────────────────────────────────────────────────
  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.card}>
      <View style={styles.cardAvatarPair}>
        <View style={styles.miniAvatar}>
          <Text style={styles.miniAvatarText}>{item.senderId?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
        <View style={[styles.miniAvatar, styles.miniAvatarReceiver]}>
          <Text style={[styles.miniAvatarText, { color: '#1d4ed8' }]}>{item.receiverId?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.senderId} → {item.receiverId}
        </Text>
        <View style={styles.cardRow}>
          <Text style={styles.cardSub}>{formatDate(item.createdDate)}</Text>
          <RequestStatusBadge status={item.status} />
        </View>
      </View>
      <View style={styles.cardActions}>
        {item.status === 'PENDING' && (
          <>
            <TouchableOpacity
              style={[styles.iconBtn, styles.iconBtnSuccess]}
              onPress={() => handleRespondRequest(item.id, 'ACCEPTED')}
            >
              <Text style={{ fontSize: 14 }}>✅</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, styles.iconBtnWarn]}
              onPress={() => handleRespondRequest(item.id, 'REJECTED')}
            >
              <Text style={{ fontSize: 14 }}>❌</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.iconBtn, styles.iconBtnDanger]}
          onPress={() => handleDeleteRequest(item.id)}
        >
          <Text style={{ fontSize: 14 }}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFriendship = ({ item }: { item: Friendship }) => (
    <View style={styles.card}>
      <View style={styles.cardAvatarPair}>
        <View style={[styles.miniAvatar, styles.miniAvatarFriend]}>
          <Text style={[styles.miniAvatarText, { color: '#15803d' }]}>{item.firstUserId?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.friendIcon}>🤝</Text>
        <View style={[styles.miniAvatar, styles.miniAvatarFriend]}>
          <Text style={[styles.miniAvatarText, { color: '#15803d' }]}>{item.secondUserId?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.firstUserId} ↔ {item.secondUserId}
        </Text>
        <Text style={styles.cardSub}>Kết bạn từ: {formatDate(item.createdDate)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.iconBtn, styles.iconBtnDanger]}
        onPress={() => handleDeleteFriendship(item.id)}
      >
        <Text style={{ fontSize: 14 }}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );
  const tabBarHeight = useBottomTabBarHeight();
  const renderBlock = ({ item }: { item: Block }) => (
    <View style={styles.card}>
      <View style={styles.cardAvatarPair}>
        <View style={[styles.miniAvatar, styles.miniAvatarBlock]}>
          <Text style={[styles.miniAvatarText, { color: '#c2410c' }]}>{item.blockerId?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.blockIcon}>🚫</Text>
        <View style={[styles.miniAvatar, { backgroundColor: '#f3f4f6' }]}>
          <Text style={[styles.miniAvatarText, { color: '#6b7280' }]}>{item.blockedId?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.blockerId} chặn {item.blockedId}
        </Text>
        <Text style={styles.cardSub}>Ngày chặn: {formatDate(item.createdDate)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.iconBtn, styles.iconBtnWarn]}
        onPress={() => handleDeleteBlock(item.id)}
      >
        <Text style={{ fontSize: 14 }}>🔓</Text>
      </TouchableOpacity>
    </View>
  );

  const tabs: { key: TabKey; label: string; icon: string; count: number }[] = [
    { key: 'requests', label: 'Lời mời', icon: '📨', count: requests.length },
    { key: 'friends', label: 'Bạn bè', icon: '🤝', count: friends.length },
    { key: 'blocks', label: 'Chặn', icon: '🚫', count: blocks.length },
  ];

  const statusFilters = [
    { label: 'Tất cả', value: '' },
    { label: '⏳ Chờ', value: 'PENDING' },
    { label: '✅ Đã chấp nhận', value: 'ACCEPTED' },
    { label: '❌ Từ chối', value: 'REJECTED' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}><Text style={styles.logoIcon}>🦉</Text></View>
          <View>
            <Text style={styles.headerTitle}>Quản lý xã hội</Text>
            <Text style={styles.headerSub}>Friend requests · Bạn bè · Chặn</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={styles.tabCount}>
                <Text style={styles.tabCountText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Status filter (requests only) */}
      {activeTab === 'requests' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 40 }} // 👈 thêm
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 6,      // 👈 giảm lại
            flexDirection: 'row',
            alignItems: 'center',    // 👈 thêm
          }}
        >
          {statusFilters.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterPill, reqStatus === f.value && styles.filterPillActive]}
              onPress={() => setReqStatus(f.value)}
            >
              <Text style={[styles.filterText, reqStatus === f.value && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      {activeTab === 'requests' && (
        reqLoading ? <View style={styles.loadingBox}><ActivityIndicator size="large" color="#16a34a" /></View> : (
          <FlatList
            data={requests}
            keyExtractor={item => item.id}
            renderItem={renderRequest}
            contentContainerStyle={[
              styles.list,
              {
                flexGrow: 1,
                paddingBottom: tabBarHeight + 24,
              }
            ]}
            refreshControl={<RefreshControl refreshing={reqRefreshing} onRefresh={() => { setReqRefreshing(true); loadRequests(0, true); }} colors={['#16a34a']} />}
            onEndReached={() => { if (reqHasMore) loadRequests(reqPage + 1); }}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={<View style={styles.emptyBox}><Text style={styles.emptyIcon}>📨</Text><Text style={styles.emptyTitle}>Không có lời mời</Text></View>}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeTab === 'friends' && (
        friendsLoading ? <View style={styles.loadingBox}><ActivityIndicator size="large" color="#16a34a" /></View> : (
          <FlatList
            data={friends}
            keyExtractor={item => item.id}
            renderItem={renderFriendship}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={friendsRefreshing} onRefresh={() => { setFriendsRefreshing(true); loadFriendships(0, true); }} colors={['#16a34a']} />}
            onEndReached={() => { if (friendsHasMore) loadFriendships(friendsPage + 1); }}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={<View style={styles.emptyBox}><Text style={styles.emptyIcon}>🤝</Text><Text style={styles.emptyTitle}>Không có quan hệ bạn bè</Text></View>}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeTab === 'blocks' && (
        blocksLoading ? <View style={styles.loadingBox}><ActivityIndicator size="large" color="#16a34a" /></View> : (
          <FlatList
            data={blocks}
            keyExtractor={item => item.id}
            renderItem={renderBlock}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={blocksRefreshing} onRefresh={() => { setBlocksRefreshing(true); loadBlocks(0, true); }} colors={['#16a34a']} />}
            onEndReached={() => { if (blocksHasMore) loadBlocks(blocksPage + 1); }}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={<View style={styles.emptyBox}><Text style={styles.emptyIcon}>🚫</Text><Text style={styles.emptyTitle}>Không có block nào</Text></View>}
            showsVerticalScrollIndicator={false}
          />
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#16a34a' },
  header: {
    backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 18 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  headerSub: { color: '#bbf7d0', fontSize: 11 },

  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#16a34a' },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 13, color: '#4b5563', fontWeight: '500' },
  tabLabelActive: { color: '#16a34a', fontWeight: '700' },
  tabCount: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  tabCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  filterRow: { backgroundColor: '#f3f4f6' },
 filterPill: {
  paddingHorizontal: 12,
  height: 32,              // 👈 FIX CHIỀU CAO
  borderRadius: 10,
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#e5e7eb',
  justifyContent: 'center',
  alignItems: 'center',

  marginRight: 8,          // 👈 thay gap
},
  filterPillActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterText: { fontSize: 13, color: '#4b5563', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  loadingBox: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
 list: {
  backgroundColor: '#f3f4f6',

  paddingHorizontal: 16,
  paddingTop: 8,
  paddingBottom: 24,

  // 👇 THÊM
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  marginTop: 8,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 3,
},

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 3,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  cardAvatarPair: { flexDirection: 'row', alignItems: 'center', marginRight: 10, gap: 4 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fef9c3', alignItems: 'center', justifyContent: 'center' },
  miniAvatarReceiver: { backgroundColor: '#eff6ff' },
  miniAvatarFriend: { backgroundColor: '#dcfce7' },
  miniAvatarBlock: { backgroundColor: '#fff7ed' },
  miniAvatarText: { fontSize: 13, fontWeight: 'bold', color: '#854d0e' },
  arrow: { fontSize: 12, color: '#9ca3af' },
  friendIcon: { fontSize: 14 },
  blockIcon: { fontSize: 14 },
  cardBody: { flex: 1, gap: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  cardSub: { fontSize: 12, color: '#64748b' },
  cardActions: { flexDirection: 'row', gap: 6, marginLeft: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  iconBtnSuccess: { backgroundColor: '#dcfce7' },
  iconBtnWarn: { backgroundColor: '#fff7ed' },
  iconBtnDanger: { backgroundColor: '#fee2e2' },

  reqBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  reqBadgeText: { fontSize: 11, fontWeight: '700' },

  emptyBox: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
});

export default SocialManagementScreen;