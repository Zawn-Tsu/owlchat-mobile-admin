import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, RefreshControl, TextInput,
  Alert, Modal, ScrollView,
} from 'react-native';
import { apiClient } from '../services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  content: string;
  senderId: string;
  chatId: string;
  type: string;       // 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE'
  status: boolean;    // true = visible
  state?: string;     // 'SENT' | 'REMOVED' etc.
  sentDate?: string;
  createdDate?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────
const MessageAPI = {
  getMessages: (params: Record<string, any>) =>
    apiClient.chat.get('/admin/message', { params }),

  deleteHard: (messageId: string) =>
    apiClient.chat.delete(`/admin/message/${messageId}`),

  deleteSoft: (messageId: string) =>
    apiClient.chat.delete(`/admin/message/${messageId}/remove`),

  restore: (messageId: string) =>
    apiClient.chat.patch(`/admin/message/${messageId}/activate`),

  getByChat: (chatId: string, params?: Record<string, any>) =>
    apiClient.chat.get(`/admin/message/chat/${chatId}`, { params }),

  getBySender: (senderId: string, params?: Record<string, any>) =>
    apiClient.chat.get(`/admin/message/sender/${senderId}`, { params }),
};

// ─── Type icons ───────────────────────────────────────────────────────────────
const TYPE_ICON: Record<string, string> = {
  TEXT: '💬', IMAGE: '🖼️', VIDEO: '🎬', FILE: '📎', VOICE: '🎤',
};
const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  TEXT:  { bg: '#f0fdf4', text: '#15803d' },
  IMAGE: { bg: '#eff6ff', text: '#1d4ed8' },
  VIDEO: { bg: '#fdf4ff', text: '#7e22ce' },
  FILE:  { bg: '#fff7ed', text: '#c2410c' },
  VOICE: { bg: '#fef9c3', text: '#854d0e' },
};

const TypeBadge = ({ type }: { type: string }) => {
  const c = TYPE_COLOR[type?.toUpperCase()] ?? TYPE_COLOR.TEXT;
  return (
    <View style={[styles.typeBadge, { backgroundColor: c.bg }]}>
      <Text style={{ fontSize: 10 }}>{TYPE_ICON[type?.toUpperCase()] ?? '💬'}</Text>
      <Text style={[styles.typeBadgeText, { color: c.text }]}>{type ?? 'TEXT'}</Text>
    </View>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const MessageDetailModal = ({
  visible, message, onClose, onHardDelete, onSoftDelete, onRestore,
}: {
  visible: boolean;
  message: Message | null;
  onClose: () => void;
  onHardDelete: (id: string) => void;
  onSoftDelete: (id: string) => void;
  onRestore: (id: string) => void;
}) => {
  if (!message) return null;
  const isRemoved = message.state === 'REMOVED' || !message.status;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Chi tiết tin nhắn</Text>

          {/* Content bubble */}
          <View style={styles.messageBubble}>
            <Text style={styles.bubbleIcon}>{TYPE_ICON[message.type?.toUpperCase()] ?? '💬'}</Text>
            <Text style={styles.bubbleContent} numberOfLines={6}>
              {message.content || '(Nội dung không khả dụng)'}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            <View style={styles.infoCard}>
              {[
                { label: 'Message ID', value: message.id },
                { label: 'Người gửi', value: message.senderId },
                { label: 'Chat ID', value: message.chatId },
                { label: 'Loại', value: message.type },
                { label: 'Trạng thái', value: isRemoved ? '🗑️ Đã xoá mềm' : '✅ Bình thường' },
                { label: 'Thời gian gửi', value: message.sentDate ? new Date(message.sentDate).toLocaleString('vi-VN') : '—' },
              ].map((r, i, arr) => (
                <View key={i} style={[styles.infoRow, i < arr.length - 1 && styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>{r.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>{r.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionGroup}>
              {isRemoved ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSuccess]}
                  onPress={() => onRestore(message.id)}
                >
                  <Text style={[styles.actionBtnText, styles.actionBtnTextSuccess]}>♻️  Khôi phục tin nhắn</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnWarn]}
                  onPress={() => onSoftDelete(message.id)}
                >
                  <Text style={[styles.actionBtnText, styles.actionBtnTextWarn]}>🚫  Xoá mềm (ẩn nội dung)</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => onHardDelete(message.id)}
              >
                <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>🗑️  Xoá cứng (vĩnh viễn)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MessageManagementScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [typeFilter, setTypeFilter] = useState('');    // '' | 'TEXT' | 'IMAGE' etc.
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'true' | 'false'
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  const [selected, setSelected] = useState<Message | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { loadMessages(0, true); }, [searchDebounce, typeFilter, statusFilter]);

  const loadMessages = async (pageNum = 0, reset = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const params: Record<string, any> = {
        page: pageNum, size: PAGE_SIZE, ascSort: false,
      };
      if (searchDebounce) params.keywords = searchDebounce;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter !== '') params.status = statusFilter;

      const res = await MessageAPI.getMessages(params);
      const data: Message[] = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (reset || pageNum === 0) setMessages(data);
      else setMessages(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (e) {
      console.error('Load messages error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleHardDelete = (id: string) => {
    Alert.alert(
      '⚠️ Xoá cứng tin nhắn',
      'Tin nhắn sẽ bị xoá vĩnh viễn, không thể khôi phục!',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              await MessageAPI.deleteHard(id);
              setMessages(prev => prev.filter(m => m.id !== id));
              setDetailVisible(false);
            } catch {
              Alert.alert('Lỗi', 'Không thể xoá tin nhắn.');
            }
          },
        },
      ]
    );
  };

  const handleSoftDelete = (id: string) => {
    Alert.alert('Xoá mềm tin nhắn', 'Nội dung sẽ bị ẩn. Có thể khôi phục sau.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá mềm',
        style: 'destructive',
        onPress: async () => {
          try {
            await MessageAPI.deleteSoft(id);
            setMessages(prev =>
              prev.map(m => m.id === id ? { ...m, status: false, state: 'REMOVED' } : m)
            );
            if (selected?.id === id)
              setSelected(prev => prev ? { ...prev, status: false, state: 'REMOVED' } : null);
          } catch {
            Alert.alert('Lỗi', 'Không thể xoá tin nhắn.');
          }
        },
      },
    ]);
  };

  const handleRestore = async (id: string) => {
    try {
      await MessageAPI.restore(id);
      setMessages(prev =>
        prev.map(m => m.id === id ? { ...m, status: true, state: 'SENT' } : m)
      );
      if (selected?.id === id)
        setSelected(prev => prev ? { ...prev, status: true, state: 'SENT' } : null);
      Alert.alert('Thành công', 'Đã khôi phục tin nhắn.');
    } catch {
      Alert.alert('Lỗi', 'Không thể khôi phục tin nhắn.');
    }
  };

  const msgTypes = ['', 'TEXT', 'IMAGE', 'VIDEO', 'FILE', 'VOICE'];
  const typeLabels: Record<string, string> = {
    '': 'Tất cả', TEXT: '💬 Text', IMAGE: '🖼️ Ảnh', VIDEO: '🎬 Video', FILE: '📎 File', VOICE: '🎤 Voice',
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isRemoved = item.state === 'REMOVED' || !item.status;
    return (
      <TouchableOpacity
        style={[styles.card, isRemoved && styles.cardRemoved]}
        onPress={() => { setSelected(item); setDetailVisible(true); }}
        activeOpacity={0.7}
      >
        <View style={[styles.typeIcon, { backgroundColor: (TYPE_COLOR[item.type?.toUpperCase()] ?? TYPE_COLOR.TEXT).bg }]}>
          <Text style={{ fontSize: 18 }}>{TYPE_ICON[item.type?.toUpperCase()] ?? '💬'}</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={styles.cardSender} numberOfLines={1}>
              {item.senderId}
            </Text>
            <Text style={styles.cardTime}>{formatTime(item.sentDate)}</Text>
          </View>
          <Text
            style={[styles.cardContent, isRemoved && styles.cardContentRemoved]}
            numberOfLines={2}
          >
            {isRemoved ? '(Đã xoá mềm)' : (item.content || '(Media)')}
          </Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardChat} numberOfLines={1}>Chat: {item.chatId}</Text>
            <TypeBadge type={item.type} />
          </View>
        </View>
        {/* Quick delete button */}
        <TouchableOpacity
          style={styles.quickDeleteBtn}
          onPress={() => isRemoved ? handleRestore(item.id) : handleSoftDelete(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 16 }}>{isRemoved ? '♻️' : '🚫'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}><Text style={styles.logoIcon}>🦉</Text></View>
          <View>
            <Text style={styles.headerTitle}>Giám sát tin nhắn</Text>
            <Text style={styles.headerSub}>{messages.length} tin nhắn</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm nội dung, từ khoá nhạy cảm..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Type filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        {msgTypes.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.filterPill, typeFilter === t && styles.filterPillActive]}
            onPress={() => setTypeFilter(t)}
          >
            <Text style={[styles.filterText, typeFilter === t && styles.filterTextActive]}>
              {typeLabels[t]}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.filterDivider} />
        <TouchableOpacity
          style={[styles.filterPill, statusFilter === 'false' && styles.filterPillDanger]}
          onPress={() => setStatusFilter(statusFilter === 'false' ? '' : 'false')}
        >
          <Text style={[styles.filterText, statusFilter === 'false' && styles.filterTextDanger]}>
            🗑️ Đã xoá mềm
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMessages(0, true); }} colors={['#16a34a']} />
          }
          onEndReached={() => { if (!loadingMore && hasMore) loadMessages(page + 1); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#16a34a" style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📨</Text>
              <Text style={styles.emptyTitle}>Không có tin nhắn nào</Text>
              {search && <Text style={styles.emptyText}>Không tìm thấy "{search}"</Text>}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <MessageDetailModal
        visible={detailVisible}
        message={selected}
        onClose={() => setDetailVisible(false)}
        onHardDelete={handleHardDelete}
        onSoftDelete={handleSoftDelete}
        onRestore={handleRestore}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#16a34a' },
  header: {
    backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 18 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  headerSub: { color: '#bbf7d0', fontSize: 11 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },

  filterRow: { backgroundColor: '#f3f4f6' },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterPillActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterPillDanger: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  filterText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  filterTextDanger: { color: '#dc2626', fontWeight: '700' },
  filterDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },

  loadingBox: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  list: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardRemoved: { backgroundColor: '#fef9f9', borderWidth: 1, borderColor: '#fee2e2' },
  typeIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  cardBody: { flex: 1, gap: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardSender: { fontSize: 12, fontWeight: '700', color: '#374151', flex: 1 },
  cardTime: { fontSize: 10, color: '#9ca3af' },
  cardContent: { fontSize: 13, color: '#111827', lineHeight: 18 },
  cardContentRemoved: { color: '#9ca3af', fontStyle: 'italic' },
  cardChat: { fontSize: 10, color: '#9ca3af', flex: 1 },
  quickDeleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  typeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, gap: 3 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#9ca3af' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 12 },

  messageBubble: {
    backgroundColor: '#f9fafb', borderRadius: 14, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#f3f4f6', flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  bubbleIcon: { fontSize: 22 },
  bubbleContent: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

  infoCard: { backgroundColor: '#f9fafb', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 12, color: '#111827', fontWeight: '600', flex: 2, textAlign: 'right' },

  actionGroup: { gap: 10, marginBottom: 8 },
  actionBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnWarn: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  actionBtnSuccess: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  actionBtnDanger: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  actionBtnTextWarn: { color: '#c2410c' },
  actionBtnTextSuccess: { color: '#15803d' },
  actionBtnTextDanger: { color: '#dc2626' },

  closeBtn: { marginTop: 8, marginBottom: 4, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});

export default MessageManagementScreen;