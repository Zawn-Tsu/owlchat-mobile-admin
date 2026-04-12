import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { UserService } from '../services/userService';
import { ChatService } from '../services/chatService';
import { SocialService } from '../services/socialService';

interface ProfileStats {
  totalUsers: number;
  totalChats: number;
  totalBlocks: number;
  totalFriendRequests: number;
}

const ProfileScreen: React.FC = () => {
  const { logout } = useAuth();
  const [stats, setStats] = useState<ProfileStats>({
    totalUsers: 0, totalChats: 0, totalBlocks: 0, totalFriendRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, chatsRes, blocksRes, friendReqRes] = await Promise.all([
          UserService.getUsers({ size: 100 }),
          ChatService.getChats({ size: 100 }),
          SocialService.getBlocks({ size: 100 }),
          SocialService.getFriendRequests({ size: 100, ascSort: false }),
        ]);
        setStats({
          totalUsers: Array.isArray(usersRes) ? usersRes.length : (usersRes?.totalElements ?? 0),
          totalChats: Array.isArray(chatsRes) ? chatsRes.length : (chatsRes?.totalElements ?? 0),
          totalBlocks: Array.isArray(blocksRes) ? blocksRes.length : (blocksRes?.totalElements ?? 0),
          totalFriendRequests: Array.isArray(friendReqRes) ? friendReqRes.length : (friendReqRes?.totalElements ?? 0),
        });
      } catch (e) {
        console.error('Profile stats error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc muốn đăng xuất không?',
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: logout },
      ]
    );
  };

  const formatNumber = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

  const statItems = [
    { label: 'Người dùng', value: stats.totalUsers, icon: '👥', color: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
    { label: 'Phòng chat',  value: stats.totalChats,          icon: '💬', color: '#f0fdf4', border: '#16a34a', text: '#15803d' },
    { label: 'Báo cáo',    value: stats.totalBlocks,          icon: '🛡️', color: '#fff7ed', border: '#f97316', text: '#c2410c' },
    { label: 'Kết bạn',    value: stats.totalFriendRequests,  icon: '🤝', color: '#fdf4ff', border: '#a855f7', text: '#7e22ce' },
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
            <Text style={styles.headerSub}>Hồ sơ quản trị viên</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🦉</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>🛡️ Super Admin</Text>
          </View>
          <Text style={styles.adminName}>Admin</Text>
          <Text style={styles.adminEmail}>admin@owlchat.com</Text>
          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Đang hoạt động</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Thống kê hệ thống</Text>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#16a34a" />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            {statItems.map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: s.color, borderColor: s.border }]}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={[styles.statValue, { color: s.text }]}>{formatNumber(s.value)}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Summary */}
        <Text style={styles.sectionTitle}>Tổng quan</Text>
        <View style={styles.summaryCard}>
          {[
            { icon: '📊', title: 'Tổng dữ liệu quản lý', sub: `${formatNumber(stats.totalUsers + stats.totalChats + stats.totalBlocks + stats.totalFriendRequests)} mục` },
            { icon: '🔔', title: 'Yêu cầu kết bạn mới',  sub: `${formatNumber(stats.totalFriendRequests)} yêu cầu đang chờ` },
            { icon: '🚨', title: 'Báo cáo cần xử lý',    sub: `${formatNumber(stats.totalBlocks)} báo cáo` },
          ].map((row, i) => (
            <View key={i} style={[styles.summaryRow, i > 0 && styles.summaryRowBorder]}>
              <Text style={styles.summaryIcon}>{row.icon}</Text>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryTitle}>{row.title}</Text>
                <Text style={styles.summarySubtitle}>{row.sub}</Text>
              </View>
              <Text style={styles.summaryArrow}>→</Text>
            </View>
          ))}
        </View>

        {/* Server Status */}
        <View style={styles.serverCard}>
          <Text style={styles.serverLabel}>🖥️  Trạng thái máy chủ</Text>
          <View style={styles.serverBadge}>
            <View style={styles.serverDot} />
            <Text style={styles.serverOnline}>ONLINE</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#16a34a' },

  header: {
    backgroundColor: '#16a34a', flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 38, height: 38, backgroundColor: '#fff', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 20 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#bbf7d0', fontSize: 11 },

  body: { flex: 1, backgroundColor: '#f3f4f6' },

  avatarCard: {
    backgroundColor: '#fff', margin: 16, borderRadius: 16,
    padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 3, borderColor: '#16a34a',
  },
  avatarEmoji: { fontSize: 44 },
  roleBadge: { backgroundColor: '#dcfce7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  roleBadgeText: { color: '#16a34a', fontSize: 12, fontWeight: '700' },
  adminName: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 3 },
  adminEmail: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16a34a' },
  onlineText: { color: '#16a34a', fontSize: 11, fontWeight: '600' },

  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },
  loadingBox: { paddingVertical: 32, alignItems: 'center' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 20 },
  statCard: {
    width: '47%', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  statIcon: { fontSize: 26, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  summaryCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 14,
    borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2, overflow: 'hidden',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  summaryRowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  summaryIcon: { fontSize: 20, marginRight: 12 },
  summaryInfo: { flex: 1 },
  summaryTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  summarySubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  summaryArrow: { fontSize: 16, color: '#d1d5db' },

  serverCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 14,
    borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  serverLabel: { fontSize: 14, color: '#374151', fontWeight: '600' },
  serverBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  serverDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16a34a' },
  serverOnline: { color: '#16a34a', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, backgroundColor: '#fee2e2', padding: 15, borderRadius: 14,
  },
  logoutIcon: { fontSize: 18 },
  logoutText: { color: '#ef4444', fontWeight: 'bold', fontSize: 15 },
});

export default ProfileScreen;