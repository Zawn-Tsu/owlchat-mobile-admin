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
    { label: 'NGƯỜI DÙNG', value: formatNumber(stats.totalUsers), icon: '👤', color: '#eff6ff', border: '#3b82f6' },
    { label: 'PHÒNG CHAT', value: formatNumber(stats.totalChats), icon: '💬', color: '#f0fdf4', border: '#16a34a' },
    { label: 'BÁO CÁO', value: formatNumber(stats.totalBlocks), icon: '🛡️', color: '#fff7ed', border: '#f97316' },
  ];

  const quickActions = [
    { icon: '👤', label: 'Tài khoản', screen: 'UserManagement', bg: '#eff6ff' },
    { icon: '🛡️', label: 'Chặn/Báo cáo', screen: 'SocialManagement', bg: '#fff7ed' },
    { icon: '💬', label: 'Quản lý Chat', screen: 'ChatManagement', bg: '#f0fdf4' },
    { icon: '📨', label: 'Tin nhắn', screen: 'MessageManagement', bg: '#fdf4ff' },
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
            <Text style={styles.serverStatus}>
              SERVER: ONLINE <Text style={styles.dot}>●</Text>
            </Text>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#16a34a']}
            />
          }
        >
          {/* Stats */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.statsRow}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {statCards.map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: s.color, borderLeftColor: s.border }]}>
                <Text style={styles.statCardIcon}>{s.icon}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.actionCard, { backgroundColor: a.bg }]}
                onPress={() => navigation.navigate(a.screen)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Activity Feed */}
          <Text style={styles.sectionTitle}>Hoạt động mạng xã hội</Text>
          {friendRequests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Không có hoạt động nào</Text>
            </View>
          ) : (
            friendRequests.map((req, i) => (
              <View key={i} style={styles.activityItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {req.senderId?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityText}>
                    <Text style={styles.activityName}>{req.senderId} </Text>
                    gửi kết bạn tới {req.receiverId}
                  </Text>
                  <Text style={styles.activityTime}>
                    {new Date(req.createdDate).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <View style={styles.activityBadge}>
                  <Text style={styles.activityBadgeText}>Mới</Text>
                </View>
              </View>
            ))
          )}

          {/* Bottom padding for tab bar */}
          <View style={{ height: 16 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#16a34a' },
  loadingBox: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 38, height: 38, backgroundColor: '#fff',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { fontSize: 20 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  serverStatus: { color: '#bbf7d0', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  dot: { color: '#4ade80' },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 4 },
  iconText: { fontSize: 20 },

  body: { flex: 1, backgroundColor: '#f3f4f6' },

  statsRow: { paddingLeft: 16, paddingVertical: 16 },
  statCard: {
    borderRadius: 14,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statCardIcon: { fontSize: 20, marginBottom: 6 },
  statLabel: { fontSize: 9, color: '#6b7280', fontWeight: '700', letterSpacing: 0.5 },
  statValue: { fontSize: 30, fontWeight: 'bold', color: '#111827', marginTop: 4 },

  sectionTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#111827',
    paddingHorizontal: 16, marginBottom: 12, marginTop: 4,
  },

  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10, marginBottom: 24,
  },
  actionCard: {
    borderRadius: 14, padding: 20,
    alignItems: 'center', justifyContent: 'center', width: '47%',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, color: '#374151', fontWeight: '600' },

  activityItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#dcfce7', alignItems: 'center',
    justifyContent: 'center', marginRight: 10,
  },
  avatarText: { fontWeight: 'bold', color: '#16a34a', fontSize: 15 },
  activityInfo: { flex: 1 },
  activityText: { fontSize: 13, color: '#374151' },
  activityName: { fontWeight: 'bold', color: '#111827' },
  activityTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  activityBadge: {
    backgroundColor: '#dcfce7', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  activityBadgeText: { color: '#16a34a', fontSize: 10, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 24 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
});

export default DashboardScreen;