import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, TextInput, SafeAreaView,
} from 'react-native';
import { ChatService } from '../services/chatService';
import { Message } from '../types/api';

const MessageManagementScreen: React.FC = ({ navigation }: any) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'TEXT' | 'IMAGE'>('ALL');

  useEffect(() => { loadMessages(); }, []);

  const loadMessages = async () => {
    try {
      const res = await ChatService.getMessages({ size: 50 });
      const data = Array.isArray(res) ? res : (res?.content ?? []);
      setMessages(data);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách tin nhắn');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadMessages(); };

  const deleteMessage = (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa tin nhắn này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await ChatService.deleteMessage(id);
            setMessages(prev => prev.filter(m => m.id !== id));
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa tin nhắn');
          }
        }
      }
    ]);
  };

  const softDeleteMessage = (id: string) => {
    Alert.alert('Xác nhận', 'Ẩn tin nhắn này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Ẩn', onPress: async () => {
          try {
            await ChatService.softDeleteMessage(id);
            setMessages(prev => prev.map(m => m.id === id ? { ...m, status: false } : m));
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể ẩn tin nhắn');
          }
        }
      }
    ]);
  };

  const activateMessage = async (id: string) => {
    try {
      await ChatService.activateMessage(id);
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: true } : m));
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể khôi phục tin nhắn');
    }
  };

  const filtered = messages.filter(m => {
    const matchSearch = m.content?.toLowerCase().includes(search.toLowerCase()) ||
      m.senderId?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || m.type === filter;
    return matchSearch && matchFilter;
  });

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.senderBox}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.senderId?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <View>
            <Text style={styles.senderId} numberOfLines={1}>{item.senderId}</Text>
            <Text style={styles.sentDate}>{formatTime(item.sentDate)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, item.status ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={styles.badgeText}>{item.status ? 'Hiển thị' : 'Đã ẩn'}</Text>
        </View>
      </View>

      <Text style={styles.content} numberOfLines={3}>{item.content || '[Tệp đính kèm]'}</Text>

      <View style={styles.cardFooter}>
        <View style={[styles.typeTag, item.type === 'TEXT' ? styles.textTag : styles.fileTag]}>
          <Text style={styles.typeText}>{item.type === 'TEXT' ? '💬 TEXT' : '📎 ' + item.type}</Text>
        </View>
        <View style={styles.actions}>
          {item.status ? (
            <TouchableOpacity style={[styles.btn, styles.btnHide]} onPress={() => softDeleteMessage(item.id)}>
              <Text style={styles.btnText}>Ẩn</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.btn, styles.btnRestore]} onPress={() => activateMessage(item.id)}>
              <Text style={styles.btnText}>Khôi phục</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={() => deleteMessage(item.id)}>
            <Text style={styles.btnText}>Xóa</Text>
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>Quản lý Tin nhắn</Text>
        <Text style={styles.countBadge}>{filtered.length}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo nội dung hoặc người gửi..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter */}
      <View style={styles.filterRow}>
        {(['ALL', 'TEXT', 'IMAGE'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? 'Tất cả' : f === 'TEXT' ? 'Văn bản' : 'Hình ảnh'}
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
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Không có tin nhắn nào</Text>
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
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  senderBox: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontWeight: 'bold', color: '#16a34a' },
  senderId: { fontSize: 13, fontWeight: 'bold', color: '#111827', maxWidth: 150 },
  sentDate: { fontSize: 11, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  content: { fontSize: 14, color: '#374151', marginBottom: 10, lineHeight: 20 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  textTag: { backgroundColor: '#dbeafe' },
  fileTag: { backgroundColor: '#fef3c7' },
  typeText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  actions: { flexDirection: 'row', gap: 6 },
  btn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  btnHide: { backgroundColor: '#f59e0b' },
  btnRestore: { backgroundColor: '#16a34a' },
  btnDelete: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});

export default MessageManagementScreen;