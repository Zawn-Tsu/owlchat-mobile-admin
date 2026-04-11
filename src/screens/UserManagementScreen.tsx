import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, RefreshControl, TextInput,
  Alert, Modal, ScrollView,
} from 'react-native';
import { apiClient } from '../services/apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Account {
  id: string;
  username: string;
  role: string;
  status: boolean; // true = active, false = locked
  createdDate?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  gender: boolean;
  dateOfBirth: string;
  avatarUrl?: string;
}

interface UserItem {
  account: Account;
  profile?: UserProfile;
}

// ─── API helpers ─────────────────────────────────────────────────────────────
const UserAPI = {
  getAccounts: (params: Record<string, any>) =>
    apiClient.user.get('/account', { params }),

  getAccount: (id: string) =>
    apiClient.user.get(`/account/${id}`),

  updateStatus: (id: string, status: boolean) =>
    apiClient.user.patch(`/account/${id}/status/${status}`),

  deleteAccount: (id: string) =>
    apiClient.user.delete(`/account/${id}`),

  updateAccount: (id: string, data: Partial<Account>) =>
    apiClient.user.put(`/account/${id}`, data),

  getUserProfile: (id: string) =>
    apiClient.user.get(`/user/${id}`),

  getUsers: (params: Record<string, any>) =>
    apiClient.user.get('/user', { params }),
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatusBadge = ({ active }: { active: boolean }) => (
  <View style={[styles.badge, active ? styles.badgeActive : styles.badgeLocked]}>
    <View style={[styles.badgeDot, active ? styles.badgeDotActive : styles.badgeDotLocked]} />
    <Text style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextLocked]}>
      {active ? 'Hoạt động' : 'Đã khoá'}
    </Text>
  </View>
);

const RoleBadge = ({ role }: { role: string }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    ADMIN:  { bg: '#fdf4ff', text: '#7e22ce' },
    MOD:    { bg: '#eff6ff', text: '#1d4ed8' },
    USER:   { bg: '#f0fdf4', text: '#15803d' },
  };
  const c = colors[role?.toUpperCase()] ?? colors.USER;
  return (
    <View style={[styles.roleBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.roleBadgeText, { color: c.text }]}>{role ?? 'USER'}</Text>
    </View>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const UserDetailModal = ({
  visible, user, onClose, onToggleStatus, onDelete, onResetPassword,
}: {
  visible: boolean;
  user: UserItem | null;
  onClose: () => void;
  onToggleStatus: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onResetPassword: (id: string) => void;
}) => {
  if (!user) return null;
  const { account, profile } = user;
  const rows = [
    { label: 'ID tài khoản', value: account.id },
    { label: 'Username', value: account.username },
    { label: 'Role', value: account.role },
    { label: 'Họ tên', value: profile?.name ?? '—' },
    { label: 'Email', value: profile?.email ?? '—' },
    { label: 'SĐT', value: profile?.phoneNumber ?? '—' },
    { label: 'Ngày sinh', value: profile?.dateOfBirth ?? '—' },
    { label: 'Ngày tạo', value: account.createdDate ? new Date(account.createdDate).toLocaleDateString('vi-VN') : '—' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Handle bar */}
          <View style={styles.modalHandle} />

          {/* Avatar */}
          <View style={styles.modalAvatar}>
            <Text style={styles.modalAvatarText}>
              {(profile?.name ?? account.username)?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.modalName}>{profile?.name ?? account.username}</Text>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            <StatusBadge active={account.status} />
            <RoleBadge role={account.role} />
          </View>

          {/* Info rows */}
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.infoCard}>
              {rows.map((r, i) => (
                <View key={i} style={[styles.infoRow, i < rows.length - 1 && styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>{r.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{r.value}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={[styles.actionBtn, account.status ? styles.actionBtnWarn : styles.actionBtnSuccess]}
                onPress={() => onToggleStatus(account.id, account.status)}
              >
                <Text style={[styles.actionBtnText, account.status ? styles.actionBtnTextWarn : styles.actionBtnTextSuccess]}>
                  {account.status ? '🔒  Khoá tài khoản' : '🔓  Mở khoá tài khoản'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnInfo]}
                onPress={() => onResetPassword(account.id)}
              >
                <Text style={[styles.actionBtnText, styles.actionBtnTextInfo]}>🔑  Reset mật khẩu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => onDelete(account.id)}
              >
                <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>🗑️  Xoá tài khoản</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const UserManagementScreen: React.FC = ({ navigation }: any) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [statusFilter, setStatusFilter] = useState<number>(0); // 0=all, 1=active, 2=locked
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reload on filter change
  useEffect(() => {
    loadAccounts(0, true);
  }, [searchDebounce, statusFilter]);

  const loadAccounts = async (pageNum = 0, reset = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const params: Record<string, any> = {
        page: pageNum,
        size: PAGE_SIZE,
        ascSort: true,
      };
      if (searchDebounce) params.keywords = searchDebounce;
      if (statusFilter !== 0) params.status = statusFilter;

      const res = await UserAPI.getAccounts(params);
      const data: Account[] = Array.isArray(res.data)
        ? res.data
        : (res.data?.content ?? []);

      if (reset || pageNum === 0) {
        setAccounts(data);
      } else {
        setAccounts(prev => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (e) {
      console.error('Load accounts error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadAccounts(0, true); };

  const onLoadMore = () => {
    if (!loadingMore && hasMore) loadAccounts(page + 1);
  };

  const openDetail = async (account: Account) => {
    setSelectedUser({ account });
    setModalVisible(true);
    setProfileLoading(true);
    try {
      const res = await UserAPI.getUserProfile(account.id);
      const profile: UserProfile = res.data;
      setSelectedUser({ account, profile });
    } catch {
      // profile not found — ok
    } finally {
      setProfileLoading(false);
    }
  };

  const handleToggleStatus = (id: string, current: boolean) => {
    Alert.alert(
      current ? 'Khoá tài khoản' : 'Mở khoá tài khoản',
      current
        ? 'Người dùng sẽ không thể đăng nhập. Tiếp tục?'
        : 'Người dùng sẽ đăng nhập được trở lại. Tiếp tục?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          style: current ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await UserAPI.updateStatus(id, !current);
              setAccounts(prev =>
                prev.map(a => a.id === id ? { ...a, status: !current } : a)
              );
              if (selectedUser?.account.id === id) {
                setSelectedUser(prev => prev
                  ? { ...prev, account: { ...prev.account, status: !current } }
                  : null
                );
              }
            } catch {
              Alert.alert('Lỗi', 'Không thể cập nhật trạng thái tài khoản.');
            }
          },
        },
      ]
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Xoá tài khoản',
      'Hành động này không thể hoàn tác. Bạn chắc chắn muốn xoá?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserAPI.deleteAccount(id);
              setAccounts(prev => prev.filter(a => a.id !== id));
              setModalVisible(false);
            } catch {
              Alert.alert('Lỗi', 'Không thể xoá tài khoản.');
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = (id: string) => {
    Alert.prompt(
      'Reset mật khẩu',
      'Nhập mật khẩu mới cho tài khoản này:',
      async (newPassword) => {
        if (!newPassword || newPassword.length < 6) {
          Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
          return;
        }
        try {
          await UserAPI.updateAccount(id, { password: newPassword } as any);
          Alert.alert('Thành công', 'Đã reset mật khẩu.');
        } catch {
          Alert.alert('Lỗi', 'Không thể reset mật khẩu.');
        }
      },
      'secure-text'
    );
  };

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Account }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openDetail(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.cardAvatar, !item.status && styles.cardAvatarLocked]}>
        <Text style={styles.cardAvatarText}>
          {item.username?.charAt(0)?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.cardUsername} numberOfLines={1}>{item.username}</Text>
          <RoleBadge role={item.role} />
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardId} numberOfLines={1}>ID: {item.id}</Text>
          <StatusBadge active={item.status} />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.lockBtn, item.status ? styles.lockBtnActive : styles.lockBtnLocked]}
        onPress={() => handleToggleStatus(item.id, item.status)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={{ fontSize: 16 }}>{item.status ? '🔓' : '🔒'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // ── Filter pills ───────────────────────────────────────────────────────────
  const filters = [
    { label: 'Tất cả', value: 0 },
    { label: '✅ Hoạt động', value: 1 },
    { label: '🔒 Đã khoá', value: 2 },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}><Text style={styles.logoIcon}>🦉</Text></View>
          <View>
            <Text style={styles.headerTitle}>Quản lý người dùng</Text>
            <Text style={styles.headerSub}>{accounts.length} tài khoản</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation?.navigate?.('CreateUser')}
        >
          <Text style={styles.addBtnText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm username, email, ID..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
            <Text style={{ color: '#9ca3af', fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        {filters.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterPill, statusFilter === f.value && styles.filterPillActive]}
            onPress={() => setStatusFilter(f.value)}
          >
            <Text style={[styles.filterText, statusFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
          }
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color="#16a34a" style={{ marginVertical: 16 }} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyTitle}>Không có tài khoản nào</Text>
              <Text style={styles.emptyText}>
                {search ? `Không tìm thấy "${search}"` : 'Danh sách trống'}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail Modal */}
      <UserDetailModal
        visible={modalVisible}
        user={selectedUser}
        onClose={() => setModalVisible(false)}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        onResetPassword={handleResetPassword}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  addBtn: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  addBtnText: { color: '#16a34a', fontWeight: '700', fontSize: 13 },

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

  loadingBox: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9ca3af', marginTop: 8 },

  list: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardAvatarLocked: { backgroundColor: '#fee2e2' },
  cardAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#16a34a' },
  cardBody: { flex: 1, gap: 5 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardUsername: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1, marginRight: 8 },
  cardId: { fontSize: 11, color: '#9ca3af', flex: 1 },
  lockBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  lockBtnActive: { backgroundColor: '#f0fdf4' },
  lockBtnLocked: { backgroundColor: '#fee2e2' },

  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, gap: 4 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeLocked: { backgroundColor: '#fee2e2' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeDotActive: { backgroundColor: '#16a34a' },
  badgeDotLocked: { backgroundColor: '#ef4444' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  badgeTextActive: { color: '#15803d' },
  badgeTextLocked: { color: '#dc2626' },

  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptyText: { fontSize: 13, color: '#9ca3af' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, maxHeight: '90%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalAvatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 10,
    borderWidth: 3, borderColor: '#16a34a',
  },
  modalAvatarText: { fontSize: 32, fontWeight: 'bold', color: '#16a34a' },
  modalName: { fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 8 },
  modalScroll: { maxHeight: 480 },

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

  modalClose: {
    marginTop: 8, marginBottom: 4, backgroundColor: '#f3f4f6',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});

export default UserManagementScreen;