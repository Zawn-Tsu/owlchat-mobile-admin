import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, RefreshControl, TextInput, SafeAreaView,
} from 'react-native';
import { UserService } from '../services/userService';
import { Account } from '../types/api';

type RoleFilter = 'ALL' | 'ADMIN' | 'USER';

const UserManagementScreen: React.FC = ({ navigation }: any) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');

  useEffect(() => { loadAccounts(); }, []);

  const loadAccounts = async () => {
    try {
      const res = await UserService.getAccounts({ size: 100 });
      const data = Array.isArray(res) ? res : (res?.content ?? []);
      setAccounts(data);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadAccounts(); };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await UserService.updateAccountStatus(id, !currentStatus);
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: !currentStatus } : a));
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

  const deleteAccount = (id: string, username: string) => {
    Alert.alert('Xác nhận', `Xóa tài khoản "${username}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await UserService.deleteAccount(id);
            setAccounts(prev => prev.filter(a => a.id !== id));
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa tài khoản');
          }
        }
      }
    ]);
  };

  const filtered = accounts.filter(a => {
    const matchSearch = a.username?.toLowerCase().includes(search.toLowerCase()) ||
      a.id?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || a.role === roleFilter;
    return matchSearch && matchRole;
  });

  const activeCount = accounts.filter(a => a.status).length;
  const inactiveCount = accounts.filter(a => !a.status).length;

  const getRoleColor = (role: string) => {
    if (role === 'ADMIN') return { bg: '#fef3c7', text: '#d97706' };
    return { bg: '#dbeafe', text: '#2563eb' };
  };

  const renderItem = ({ item }: { item: Account }) => {
    const roleColor = getRoleColor(item.role);
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.avatar, item.status ? styles.avatarActive : styles.avatarInactive]}>
            <Text style={styles.avatarText}>{item.username?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.userId} numberOfLines={1}>ID: {item.id}</Text>
            <View style={styles.tagsRow}>
              <View style={[styles.roleTag, { backgroundColor: roleColor.bg }]}>
                <Text style={[styles.roleText, { color: roleColor.text }]}>{item.role}</Text>
              </View>
              <View style={[styles.statusTag, item.status ? styles.statusActive : styles.statusInactive]}>
                <Text style={styles.statusText}>{item.status ? '● Hoạt động' : '● Bị khóa'}</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, item.status ? styles.btnLock : styles.btnUnlock]}
            onPress={() => toggleStatus(item.id, item.status)}
          >
            <Text style={styles.btnText}>{item.status ? '🔒 Khóa' : '🔓 Mở khóa'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnDelete]}
            onPress={() => deleteAccount(item.id, item.username)}
          >
            <Text style={styles.btnText}>🗑 Xóa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý Tài khoản</Text>
        <Text style={styles.countBadge}>{filtered.length}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{accounts.length}</Text>
          <Text style={styles.statLabel}>Tổng</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{activeCount}</Text>
          <Text style={styles.statLabel}>Hoạt động</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>{inactiveCount}</Text>
          <Text style={styles.statLabel}>Bị khóa</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên hoặc ID..."
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Role Filter */}
      <View style={styles.filterRow}>
        {(['ALL', 'ADMIN', 'USER'] as RoleFilter[]).map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.filterBtn, roleFilter === r && styles.filterBtnActive]}
            onPress={() => setRoleFilter(r)}
          >
            <Text style={[styles.filterText, roleFilter === r && styles.filterTextActive]}>
              {r === 'ALL' ? 'Tất cả' : r === 'ADMIN' ? '👑 Admin' : '👤 User'}
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
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyText}>Không có tài khoản nào</Text>
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

  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingVertical: 12, paddingHorizontal: 16, gap: 8,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 16, borderRadius: 12, paddingHorizontal: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  clearBtn: { fontSize: 16, color: '#9ca3af', padding: 4 },

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
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarActive: { backgroundColor: '#dcfce7' },
  avatarInactive: { backgroundColor: '#fee2e2' },
  avatarText: { fontWeight: 'bold', fontSize: 16, color: '#374151' },
  cardInfo: { flex: 1 },
  username: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  userId: { fontSize: 11, color: '#9ca3af', marginTop: 2, marginBottom: 6 },
  tagsRow: { flexDirection: 'row', gap: 6 },
  roleTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 11, fontWeight: '700' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusInactive: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  btn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  btnLock: { backgroundColor: '#f59e0b' },
  btnUnlock: { backgroundColor: '#16a34a' },
  btnDelete: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});

export default UserManagementScreen;