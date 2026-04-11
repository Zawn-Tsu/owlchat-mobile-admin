import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { UserService } from '../services/userService';
import { ChatService } from '../services/chatService';
import { SocialService } from '../services/socialService';
 
interface DashboardStats {
  totalUsers: number;
  totalChats: number;
  totalBlocks: number;
}
 
const DashboardScreen: React.FC = ({ navigation }: any) => {
  const { logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, totalChats: 0, totalBlocks: 0 });
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
 
  const fetchData = async () => {
  try {
    const [usersRes, chatsRes, blocksRes, friendReqRes] = await Promise.all([
      UserService.getUsers({ size: 100 }),
      ChatService.getChats({ size: 100 }),
      SocialService.getBlocks({ size: 100 }),
      SocialService.getFriendRequests({ size: 5, ascSort: false }),
    ]);

    setStats({
      totalUsers: Array.isArray(usersRes) ? usersRes.length : (usersRes?.totalElements ?? 0),
      totalChats: Array.isArray(chatsRes) ? chatsRes.length : (chatsRes?.totalElements ?? 0),
      totalBlocks: Array.isArray(blocksRes) ? blocksRes.length : (blocksRes?.totalElements ?? 0),
    });
    setFriendRequests(Array.isArray(friendReqRes) ? friendReqRes : (friendReqRes?.content ?? []));
  } catch (error) {
    console.error('Dashboard fetch error:', error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
 
  useEffect(() => { fetchData(); }, []);
 
  const onRefresh = () => { setRefreshing(true); fetchData(); };
 
  const formatNumber = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
 
  const statCards = [
    { label: 'NGƯỜI DÙNG', value: formatNumber(stats.totalUsers) },
    { label: 'PHÒNG CHAT', value: formatNumber(stats.totalChats) },
    { label: 'BÁO CÁO', value: formatNumber(stats.totalBlocks) },
  ];
 
  const quickActions = [
    { icon: '👤', label: 'Tài khoản', screen: 'UserManagement' },
    { icon: '🛡️', label: 'Chặn/Báo cáo', screen: 'SocialManagement' },
    { icon: '💬', label: 'Quản lý Chat', screen: 'ChatManagement' },
    { icon: '📨', label: 'Tin nhắn', screen: 'MessageManagement' },
  ];
 
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>🦉</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>OwlAdmin</Text>
            <Text style={styles.serverStatus}>SERVER: ONLINE <Text style={styles.dot}>●</Text></Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={styles.iconText}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>
 
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
        >
          {/* Stats */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow}>
            {statCards.map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </ScrollView>
 
          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)}>
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
 
          {/* Activity Feed */}
          <Text style={styles.sectionTitle}>Hoạt động mạng xã hội</Text>
          {friendRequests.length === 0 ? (
            <Text style={styles.emptyText}>Không có hoạt động nào</Text>
          ) : (
            friendRequests.map((req, i) => (
              <View key={i} style={styles.activityItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{req.senderId?.charAt(0)?.toUpperCase() || '?'}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityText}>
                    <Text style={styles.activityName}>{req.senderId} </Text>
                    gửi kết bạn tới {req.receiverId}
                  </Text>
                  <Text style={styles.activityTime}>{new Date(req.createdDate).toLocaleDateString('vi-VN')}</Text>
                </View>
                <Text style={styles.activityArrow}>↗</Text>
              </View>
            ))
          )}
 
          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
 
      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIconActive}>⊞</Text>
          <Text style={styles.navLabelActive}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('UserManagement')}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navLabel}>Tài khoản</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('ChatManagement')}>
          <Text style={styles.navIcon}>💬</Text>
          <Text style={styles.navLabel}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('SocialManagement')}>
          <Text style={styles.navIcon}>🌐</Text>
          <Text style={styles.navLabel}>Xã hội</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
 
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#16a34a' },
  loadingBox: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
 
  header: {
    backgroundColor: '#16a34a', flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 20 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  serverStatus: { color: '#bbf7d0', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  dot: { color: '#4ade80' },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 4 },
  iconText: { fontSize: 20 },
 
  body: { flex: 1, backgroundColor: '#f3f4f6' },
 
  statsRow: { paddingHorizontal: 16, paddingVertical: 16 },
  statCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginRight: 12, minWidth: 110,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statLabel: { fontSize: 9, color: '#9ca3af', fontWeight: '700', letterSpacing: 0.5 },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginTop: 4 },
 
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', paddingHorizontal: 16, marginBottom: 12, marginTop: 4 },
 
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 24 },
  actionCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    alignItems: 'center', justifyContent: 'center', width: '47%',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
 
  activityItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontWeight: 'bold', color: '#374151' },
  activityInfo: { flex: 1 },
  activityText: { fontSize: 13, color: '#374151' },
  activityName: { fontWeight: 'bold' },
  activityTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  activityArrow: { fontSize: 16, color: '#9ca3af' },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginVertical: 16 },
 
  logoutBtn: { margin: 16, marginTop: 24, backgroundColor: '#fee2e2', padding: 14, borderRadius: 12, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 15 },
 
  bottomNav: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingVertical: 8, paddingBottom: 12 },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 22, color: '#9ca3af' },
  navIconActive: { fontSize: 22, color: '#16a34a' },
  navLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  navLabelActive: { fontSize: 11, color: '#16a34a', fontWeight: '600', marginTop: 2 },
});
 
export default DashboardScreen;