import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, TextInput, SafeAreaView,
} from 'react-native';
import { SocialService } from '../services/socialService';
import { FriendRequest, Friendship, Block } from '../types/api';

type Tab = 'REQUESTS' | 'FRIENDS' | 'BLOCKS';

const SocialManagementScreen: React.FC = ({ navigation }: any) => {
  const [tab, setTab] = useState<Tab>('REQUESTS');
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [frRes, fRes, bRes] = await Promise.all([
        SocialService.getFriendRequests({ size: 50 }),
        SocialService.getFriendships(),
        SocialService.getBlocks({ size: 50 }),
      ]);
      setFriendRequests(Array.isArray(frRes) ? frRes : (frRes?.content ?? []));
      setFriendships(Array.isArray(fRes) ? fRes : []);
      setBlocks(Array.isArray(bRes) ? bRes : (bRes?.content ?? []));
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const respondRequest = (id: string, action: 'ACCEPTED' | 'REJECTED') => {
    Alert.alert('Xác nhận', action === 'ACCEPTED' ? 'Chấp nhận lời mời?' : 'Từ chối lời mời?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận', onPress: async () => {
          try {
            await SocialService.respondFriendRequest(id, action);
            setFriendRequests(prev => prev.filter(r => r.id !== id));
          } catch {
            Alert.alert('Lỗi', 'Không thể xử lý lời mời');
          }
        }
      }
    ]);
  };

  const deleteFriendRequest = (id: string) => {
    Alert.alert('Xác nhận', 'Xóa lời mời kết bạn này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await SocialService.deleteFriendRequest(id);
            setFriendRequests(prev => prev.filter(r => r.id !== id));
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa lời mời');
          }
        }
      }
    ]);
  };

  const deleteFriendship = (id: string) => {
    Alert.alert('Xác nhận', 'Xóa mối quan hệ bạn bè này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await SocialService.deleteFriendship(id);
            setFriendships(prev => prev.filter(f => f.id !== id));
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa bạn bè');
          }
        }
      }
    ]);
  };

  const deleteBlock = (id: string) => {
    Alert.alert('Xác nhận', 'Gỡ chặn này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Gỡ', style: 'destructive', onPress: async () => {
          try {
            await SocialService.deleteBlock(id);
            setBlocks(prev => prev.filter(b => b.id !== id));
          } catch {
            Alert.alert('Lỗi', 'Không thể gỡ chặn');
          }
        }
      }
    ]);
  };

  const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
    { key: 'REQUESTS', label: 'Lời mời', icon: '👋', count: friendRequests.length },
    { key: 'FRIENDS', label: 'Bạn bè', icon: '🤝', count: friendships.length },
    { key: 'BLOCKS', label: 'Chặn', icon: '🚫', count: blocks.length },
  ];

  const statusColor = (status: string) => {
    if (status === 'ACCEPTED') return '#16a34a';
    if (status === 'REJECTED') return '#ef4444';
    return '#f59e0b';
  };

  const statusLabel = (status: string) => {
    if (status === 'ACCEPTED') return 'Đã chấp nhận';
    if (status === 'REJECTED') return 'Đã từ chối';
    return 'Chờ duyệt';
  };

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{item.senderId?.charAt(0)?.toUpperCase()}</Text></View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.senderId}</Text>
          <Text style={styles.cardSub}>→ {item.receiverId}</Text>
          <Text style={styles.cardDate}>{item.createdDate ? new Date(item.createdDate).toLocaleDateString('vi-VN') : ''}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '22' }]}>
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
        </View>
      </View>
      {item.status === 'PENDING' && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => respondRequest(item.id, 'ACCEPTED')}>
            <Text style={styles.btnText}>✓ Chấp nhận</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => respondRequest(item.id, 'REJECTED')}>
            <Text style={styles.btnText}>✕ Từ chối</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={() => deleteFriendRequest(item.id)}>
            <Text style={styles.btnText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      )}
      {item.status !== 'PENDING' && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={() => deleteFriendRequest(item.id)}>
            <Text style={styles.btnText}>Xóa</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderFriendship = ({ item }: { item: Friendship }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{item.firstUserId?.charAt(0)?.toUpperCase()}</Text></View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.firstUserId}</Text>
          <Text style={styles.cardSub}>🤝 {item.secondUserId}</Text>
          <Text style={styles.cardDate}>{item.createdDate ? new Date(item.createdDate).toLocaleDateString('vi-VN') : ''}</Text>
        </View>
        <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={() => deleteFriendship(item.id)}>
          <Text style={styles.btnText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBlock = ({ item }: { item: Block }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={[styles.avatar, styles.avatarRed]}><Text style={styles.avatarText}>{item.blockerId?.charAt(0)?.toUpperCase()}</Text></View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.blockerId}</Text>
          <Text style={styles.cardSub}>🚫 {item.blockedId}</Text>
          <Text style={styles.cardDate}>{item.createdDate ? new Date(item.createdDate).toLocaleDateString('vi-VN') : ''}</Text>
        </View>
        <TouchableOpacity style={[styles.btn, styles.btnRestore]} onPress={() => deleteBlock(item.id)}>
          <Text style={styles.btnText}>Gỡ chặn</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getFilteredData = () => {
    if (tab === 'REQUESTS') return friendRequests.filter(r =>
      r.senderId?.toLowerCase().includes(search.toLowerCase()) ||
      r.receiverId?.toLowerCase().includes(search.toLowerCase()));
    if (tab === 'FRIENDS') return friendships.filter(f =>
      f.firstUserId?.toLowerCase().includes(search.toLowerCase()) ||
      f.secondUserId?.toLowerCase().includes(search.toLowerCase()));
    return blocks.filter(b =>
      b.blockerId?.toLowerCase().includes(search.toLowerCase()) ||
      b.blockedId?.toLowerCase().includes(search.toLowerCase()));
  };

  const data = getFilteredData();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Xã hội</Text>
        <Text style={styles.countBadge}>{data.length}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]} onPress={() => setTab(t.key)}>
            <Text style={styles.tabIcon}>{t.icon}</Text>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            <View style={[styles.tabCount, tab === t.key && styles.tabCountActive]}>
              <Text style={[styles.tabCountText, tab === t.key && styles.tabCountTextActive]}>{t.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm theo ID người dùng..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={data as any[]}
          renderItem={tab === 'REQUESTS' ? renderRequest : tab === 'FRIENDS' ? renderFriendship : renderBlock}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>{tabs.find(t => t.key === tab)?.icon}</Text>
              <Text style={styles.emptyText}>Không có dữ liệu</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f3f4f6' },

  header: {
    backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 22 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 18, fontWeight: 'bold' },
  countBadge: {
    backgroundColor: '#fff', color: '#16a34a', fontWeight: 'bold',
    fontSize: 13, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12,
  },

  tabRow: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 10, gap: 4, backgroundColor: '#f3f4f6',
  },
  tabBtnActive: { backgroundColor: '#dcfce7' },
  tabIcon: { fontSize: 14 },
  tabText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  tabTextActive: { color: '#16a34a', fontWeight: '700' },
  tabCount: { backgroundColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  tabCountActive: { backgroundColor: '#16a34a' },
  tabCountText: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  tabCountTextActive: { color: '#fff' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 16, borderRadius: 12, paddingHorizontal: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },

  list: { paddingHorizontal: 16, paddingBottom: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  avatarRed: { backgroundColor: '#fee2e2' },
  avatarText: { fontWeight: 'bold', color: '#374151' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
  cardSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end' },
  btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  btnAccept: { backgroundColor: '#16a34a' },
  btnReject: { backgroundColor: '#f59e0b' },
  btnDelete: { backgroundColor: '#ef4444' },
  btnRestore: { backgroundColor: '#3b82f6' },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});

export default SocialManagementScreen;