import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, TextInput, SafeAreaView,
} from 'react-native';
import { ChatService } from '../services/chatService';
import { Chat } from '../types/api';

const ChatManagementScreen: React.FC = ({ navigation }: any) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PRIVATE' | 'GROUP'>('ALL');

  useEffect(() => { loadChats(); }, []);

  const loadChats = async () => {
    try {
      const res = await ChatService.getChats({ size: 50 });
      const data = Array.isArray(res) ? res : (res?.content ?? []);
      setChats(data);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách chat');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadChats(); };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await ChatService.toggleChatStatus(id, !currentStatus);
      setChats(prev => prev.map(c => c.id === id ? { ...c, status: !currentStatus } : c));
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const deleteChat = (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa phòng chat này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await ChatService.deleteChat(id);
            setChats(prev => prev.filter(c => c.id !== id));
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa phòng chat');
          }
        }
      }
    ]);
  };

  const filtered = chats.filter(c => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || c.type === filter;
    return matchSearch && matchFilter;
  });

  const renderItem = ({ item }: { item: Chat }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.typeTag, item.type === 'GROUP' ? styles.groupTag : styles.privateTag]}>
          <Text style={styles.typeText}>{item.type === 'GROUP' ? '👥' : '💬'} {item.type}</Text>
        </View>
        <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.chatId} numberOfLines={1}>ID: {item.id}</Text>
        <Text style={styles.chatDate}>
          {item.createdDate ? new Date(item.createdDate).toLocaleDateString('vi-VN') : ''}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.statusDot, item.status ? styles.dotActive : styles.dotInactive]} />
        <TouchableOpacity
          style={[styles.btn, item.status ? styles.btnDisable : styles.btnEnable]}
          onPress={() => toggleStatus(item.id, item.status)}
        >
          <Text style={styles.btnText}>{item.status ? 'Khóa' : 'Mở'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={() => deleteChat(item.id)}>
          <Text style={styles.btnText}>Xóa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Chat</Text>
        <Text style={styles.countBadge}>{filtered.length}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm phòng chat..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {(['ALL', 'PRIVATE', 'GROUP'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? 'Tất cả' : f === 'PRIVATE' ? 'Riêng tư' : 'Nhóm'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>Không có phòng chat nào</Text>
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

  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 16, borderRadius: 12, paddingHorizontal: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterBtnActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterText: { fontSize: 13, color: '#6b7280' },
  filterTextActive: { color: '#fff', fontWeight: '600' },

  list: { paddingHorizontal: 16, paddingBottom: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardLeft: { flex: 1, marginRight: 10 },
  typeTag: { flexDirection: 'row', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 6 },
  privateTag: { backgroundColor: '#dbeafe' },
  groupTag: { backgroundColor: '#dcfce7' },
  typeText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  chatName: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 2 },
  chatId: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  chatDate: { fontSize: 11, color: '#9ca3af' },

  cardRight: { alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  dotActive: { backgroundColor: '#16a34a' },
  dotInactive: { backgroundColor: '#ef4444' },

  btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minWidth: 56, alignItems: 'center' },
  btnEnable: { backgroundColor: '#16a34a' },
  btnDisable: { backgroundColor: '#f59e0b' },
  btnDelete: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});

export default ChatManagementScreen;