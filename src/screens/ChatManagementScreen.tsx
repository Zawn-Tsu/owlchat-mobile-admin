import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, RefreshControl, TextInput,
  Alert, Modal, ScrollView,
} from 'react-native';
import { apiClient } from '../services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Chat {
  id: string;
  name: string;
  type: string;        // 'GROUP' | 'PRIVATE'
  status: boolean;     // true = active
  initiatorId: string;
  createdDate?: string;
  memberCount?: number;
}

interface Member {
  memberId: string;
  chatId: string;
  role: string;
  nickname?: string;
  joinDate?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────
const ChatAPI = {
  getChats: (params: Record<string, any>) =>
    apiClient.chat.get('/admin/chat', { params }),

  getChat: (chatId: string) =>
    apiClient.chat.get(`/admin/chat/${chatId}`),

  deleteChat: (chatId: string) =>
    apiClient.chat.delete(`/admin/chat/${chatId}`),

  updateStatus: (chatId: string, status: boolean) =>
    apiClient.chat.patch(
      `/admin/chat/${chatId}/status`,
      { status } // 👈 gửi object chuẩn
    ),

  getMembers: (chatId: string) =>
    apiClient.chat.get(`/admin/member/chat/${chatId}`),

  removeMember: (memberId: string, chatId: string) =>
    apiClient.chat.delete(`/admin/member/${memberId}/chat/${chatId}`),

  updateMemberRole: (memberId: string, chatId: string, role: string) =>
    apiClient.chat.patch(
      `/admin/member/${memberId}/chat/${chatId}/role`,
      { role }
    ),
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const ChatTypeBadge = ({ type }: { type: string }) => {
  const isGroup = type?.toUpperCase() === 'GROUP';
  return (
    <View style={[styles.typeBadge, isGroup ? styles.typeBadgeGroup : styles.typeBadgePrivate]}>
      <Text style={[styles.typeBadgeText, isGroup ? styles.typeBadgeTextGroup : styles.typeBadgeTextPrivate]}>
        {isGroup ? '👥 Nhóm' : '💬 Riêng tư'}
      </Text>
    </View>
  );
};

const StatusBadge = ({ active }: { active: boolean }) => (
  <View style={[styles.statusBadge, active ? styles.statusActive : styles.statusLocked]}>
    <View style={[styles.statusDot, active ? styles.statusDotActive : styles.statusDotLocked]} />
    <Text style={[styles.statusText, active ? styles.statusTextActive : styles.statusTextLocked]}>
      {active ? 'Hoạt động' : 'Đã khoá'}
    </Text>
  </View>
);

// ─── Member Modal ─────────────────────────────────────────────────────────────
const MembersModal = ({
  visible, chat, onClose,
}: {
  visible: boolean;
  chat: Chat | null;
  onClose: () => void;
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && chat) {
      setLoading(true);
      ChatAPI.getMembers(chat.id)
        .then(res => setMembers(Array.isArray(res.data) ? res.data : (res.data?.content ?? [])))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible, chat]);

  const handleRemove = (memberId: string) => {
    if (!chat) return;
    Alert.alert('Kick thành viên', 'Xoá thành viên khỏi phòng?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Kick',
        style: 'destructive',
        onPress: async () => {
          try {
            await ChatAPI.removeMember(memberId, chat.id);
            setMembers(prev => prev.filter(m => m.memberId !== memberId));
          } catch {
            Alert.alert('Lỗi', 'Không thể kick thành viên.');
          }
        },
      },
    ]);
  };

  const handlePromote = (memberId: string) => {
    if (!chat) return;
    Alert.alert('Gán Moderator', 'Gán vai trò MOD cho thành viên này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Gán MOD',
        onPress: async () => {
          try {
            await ChatAPI.updateMemberRole(memberId, chat.id, 'MOD');
            setMembers(prev =>
              prev.map(m => m.memberId === memberId ? { ...m, role: 'MOD' } : m)
            );
          } catch {
            Alert.alert('Lỗi', 'Không thể gán role.');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>
            👥 Thành viên — {chat?.name ?? 'Phòng chat'}
          </Text>
          <Text style={styles.modalSub}>{members.length} thành viên</Text>

          {loading ? (
            <ActivityIndicator color="#16a34a" style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={members}
              keyExtractor={m => m.memberId}
              style={{ maxHeight: 420 }}
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(item.nickname ?? item.memberId)?.charAt(0)?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {item.nickname ?? item.memberId}
                    </Text>
                    <Text style={styles.memberId} numberOfLines={1}>ID: {item.memberId}</Text>
                  </View>
                  <View style={[styles.memberRoleBadge,
                    item.role === 'MOD' ? styles.memberRoleMod : styles.memberRoleUser]}>
                    <Text style={[styles.memberRoleText,
                      item.role === 'MOD' ? styles.memberRoleTextMod : styles.memberRoleTextUser]}>
                      {item.role}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8 }}>
                    {item.role !== 'MOD' && (
                      <TouchableOpacity
                        style={styles.memberActionBtn}
                        onPress={() => handlePromote(item.memberId)}
                      >
                        <Text style={{ fontSize: 14 }}>⭐</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.memberActionBtn, styles.memberActionBtnDanger]}
                      onPress={() => handleRemove(item.memberId)}
                    >
                      <Text style={{ fontSize: 14 }}>🚫</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#9ca3af', marginVertical: 24 }}>
                  Không có thành viên
                </Text>
              }
            />
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const ChatDetailModal = ({
  visible, chat, onClose, onToggleStatus, onDelete, onViewMembers,
}: {
  visible: boolean;
  chat: Chat | null;
  onClose: () => void;
  onToggleStatus: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onViewMembers: (chat: Chat) => void;
}) => {
  if (!chat) return null;
  const rows = [
    { label: 'Chat ID', value: chat.id },
    { label: 'Tên phòng', value: chat.name || '(Không tên)' },
    { label: 'Loại', value: chat.type },
    { label: 'Initiator ID', value: chat.initiatorId },
    { label: 'Ngày tạo', value: chat.createdDate ? new Date(chat.createdDate).toLocaleDateString('vi-VN') : '—' },
  ];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.chatDetailIcon}>
            <Text style={{ fontSize: 36 }}>{chat.type === 'GROUP' ? '👥' : '💬'}</Text>
          </View>
          <Text style={styles.modalTitle}>{chat.name || '(Không tên)'}</Text>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
            <ChatTypeBadge type={chat.type} />
            <StatusBadge active={chat.status} />
          </View>

          <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
            <View style={styles.infoCard}>
              {rows.map((r, i) => (
                <View key={i} style={[styles.infoRow, i < rows.length - 1 && styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>{r.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{r.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnInfo]}
                onPress={() => { onClose(); onViewMembers(chat); }}
              >
                <Text style={[styles.actionBtnText, styles.actionBtnTextInfo]}>👥  Xem thành viên</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, chat.status ? styles.actionBtnWarn : styles.actionBtnSuccess]}
                onPress={() => onToggleStatus(chat.id, chat.status)}
              >
                <Text style={[styles.actionBtnText, chat.status ? styles.actionBtnTextWarn : styles.actionBtnTextSuccess]}>
                  {chat.status ? '🔒  Khoá phòng' : '🔓  Mở khoá phòng'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => onDelete(chat.id)}
              >
                <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>🗑️  Xoá phòng chat</Text>
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
const ChatManagementScreen: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');   // '' | 'GROUP' | 'PRIVATE'
  const [statusFilter, setStatusFilter] = useState<string>(''); // '' | 'true' | 'false'
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const [membersChat, setMembersChat] = useState<Chat | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { loadChats(0, true); }, [searchDebounce, typeFilter, statusFilter]);

  const loadChats = async (pageNum = 0, reset = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const params: Record<string, any> = { page: pageNum, size: PAGE_SIZE, ascSort: false };
      if (searchDebounce) params.keywords = searchDebounce;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter !== '') params.status = statusFilter;

      const res = await ChatAPI.getChats(params);
      const data: Chat[] = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      if (reset || pageNum === 0) setChats(data);
      else setChats(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (e) {
      console.error('Load chats error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleToggleStatus = (chatId: string, current: boolean) => {
    Alert.alert(
      current ? 'Khoá phòng chat' : 'Mở khoá phòng',
      current ? 'Phòng sẽ bị vô hiệu hoá. Tiếp tục?' : 'Phòng sẽ hoạt động trở lại. Tiếp tục?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: current ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await ChatAPI.updateStatus(chatId, !current);
              setChats(prev => prev.map(c => c.id === chatId ? { ...c, status: !current } : c));
              if (selectedChat?.id === chatId)
                setSelectedChat(prev => prev ? { ...prev, status: !current } : null);
            } catch {
              Alert.alert('Lỗi', 'Không thể cập nhật trạng thái.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (chatId: string) => {
    Alert.alert('Xoá phòng chat', 'Hành động này không thể hoàn tác!', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await ChatAPI.deleteChat(chatId);
            setChats(prev => prev.filter(c => c.id !== chatId));
            setDetailVisible(false);
          } catch {
            Alert.alert('Lỗi', 'Không thể xoá phòng chat.');
          }
        },
      },
    ]);
  };

  const typeFilters = [
    { label: 'Tất cả', value: '' },
    { label: '👥 Nhóm', value: 'GROUP' },
    { label: '💬 Riêng tư', value: 'PRIVATE' },
  ];

  const renderItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => { setSelectedChat(item); setDetailVisible(true); }}
      activeOpacity={0.7}
    >
      <View style={[styles.chatIcon, item.type === 'GROUP' ? styles.chatIconGroup : styles.chatIconPrivate]}>
        <Text style={{ fontSize: 20 }}>{item.type === 'GROUP' ? '👥' : '💬'}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name || '(Không tên)'}</Text>
          <StatusBadge active={item.status} />
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardId} numberOfLines={1}>ID: {item.id}</Text>
          <ChatTypeBadge type={item.type} />
        </View>
      </View>
      <TouchableOpacity
        style={styles.memberBtn}
        onPress={() => { setMembersChat(item); setMembersVisible(true); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={{ fontSize: 16 }}>👥</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}><Text style={styles.logoIcon}>🦉</Text></View>
          <View>
            <Text style={styles.headerTitle}>Quản lý phòng chat</Text>
            <Text style={styles.headerSub}>{chats.length} phòng</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm tên phòng, ID..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        {typeFilters.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterPill, typeFilter === f.value && styles.filterPillActive]}
            onPress={() => setTypeFilter(f.value)}
          >
            <Text style={[styles.filterText, typeFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.filterDivider} />
        <TouchableOpacity
          style={[styles.filterPill, statusFilter === 'true' && styles.filterPillActive]}
          onPress={() => setStatusFilter(statusFilter === 'true' ? '' : 'true')}
        >
          <Text style={[styles.filterText, statusFilter === 'true' && styles.filterTextActive]}>
            ✅ Hoạt động
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterPill, statusFilter === 'false' && styles.filterPillActive]}
          onPress={() => setStatusFilter(statusFilter === 'false' ? '' : 'false')}
        >
          <Text style={[styles.filterText, statusFilter === 'false' && styles.filterTextActive]}>
            🔒 Đã khoá
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadChats(0, true); }} colors={['#16a34a']} />
          }
          onEndReached={() => { if (!loadingMore && hasMore) loadChats(page + 1); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#16a34a" style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>Không có phòng chat nào</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ChatDetailModal
        visible={detailVisible}
        chat={selectedChat}
        onClose={() => setDetailVisible(false)}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        onViewMembers={(chat) => { setMembersChat(chat); setMembersVisible(true); }}
      />
      <MembersModal
        visible={membersVisible}
        chat={membersChat}
        onClose={() => setMembersVisible(false)}
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
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterPillActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  filterDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },

  loadingBox: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  list: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  chatIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  chatIconGroup: { backgroundColor: '#eff6ff' },
  chatIconPrivate: { backgroundColor: '#f0fdf4' },
  cardBody: { flex: 1, gap: 5 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  cardId: { fontSize: 11, color: '#9ca3af', flex: 1 },
  memberBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typeBadgeGroup: { backgroundColor: '#eff6ff' },
  typeBadgePrivate: { backgroundColor: '#f0fdf4' },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  typeBadgeTextGroup: { color: '#1d4ed8' },
  typeBadgeTextPrivate: { color: '#15803d' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, gap: 4 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusLocked: { backgroundColor: '#fee2e2' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusDotActive: { backgroundColor: '#16a34a' },
  statusDotLocked: { backgroundColor: '#ef4444' },
  statusText: { fontSize: 10, fontWeight: '600' },
  statusTextActive: { color: '#15803d' },
  statusTextLocked: { color: '#dc2626' },

  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  chatDetailIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 16 },

  infoCard: { backgroundColor: '#f9fafb', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '600', flex: 2, textAlign: 'right' },

  actionGroup: { gap: 10, marginBottom: 8 },
  actionBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnWarn: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  actionBtnSuccess: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  actionBtnInfo: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  actionBtnDanger: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  actionBtnTextWarn: { color: '#c2410c' },
  actionBtnTextSuccess: { color: '#15803d' },
  actionBtnTextInfo: { color: '#1d4ed8' },
  actionBtnTextDanger: { color: '#dc2626' },

  closeBtn: { marginTop: 8, marginBottom: 4, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  memberAvatarText: { fontSize: 15, fontWeight: 'bold', color: '#16a34a' },
  memberName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  memberId: { fontSize: 10, color: '#9ca3af' },
  memberRoleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  memberRoleMod: { backgroundColor: '#eff6ff' },
  memberRoleUser: { backgroundColor: '#f3f4f6' },
  memberRoleText: { fontSize: 10, fontWeight: '700' },
  memberRoleTextMod: { color: '#1d4ed8' },
  memberRoleTextUser: { color: '#6b7280' },
  memberActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  memberActionBtnDanger: { backgroundColor: '#fee2e2' },
});

export default ChatManagementScreen;