import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, ActivityIndicator,
  RefreshControl, Animated,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/apiClient';

interface DashboardStats {
  totalUsers: number; activeUsers: number; lockedUsers: number;
  totalChats: number; activeChats: number;
  totalBlocks: number; totalFriendships: number; pendingRequests: number;
  totalMessages: number; removedMessages: number;
}
interface FriendRequest {
  id: string; senderId: string; receiverId: string;
  status: string; createdDate?: string;
}

export const DashAPI = {
  // ─── USER ─────────────────────────────
  getAccounts: (params?: Record<string, any>) =>
    apiClient.user.get('/account', { params }),

  // ─── CHAT ─────────────────────────────
  getChats: (params?: Record<string, any>) =>
    apiClient.chat.get('/admin/chat', { params }),

  getMessages: (params?: Record<string, any>) =>
    apiClient.chat.get('/admin/message', { params }),

  // ─── SOCIAL ───────────────────────────
  getBlocks: (params?: Record<string, any>) =>
    apiClient.social.get('/admin/block', { params }),

  getFriendships: (params?: Record<string, any>) =>
    apiClient.social.get('/admin/friendship', { params }),

  getFriendRequests: (params?: Record<string, any>) =>
    apiClient.social.get('/admin/friend-request', { params }),
};

// ── Mini Bar Chart ─────────────────────────────────────────────────────────────
const MiniBarChart = ({ data, color, label }: {
  data: { label: string; value: number }[]; color: string; label: string;
}) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const animVals = useRef(data.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(80, animVals.map((av, i) =>
      Animated.timing(av, { toValue: data[i].value / max, duration: 500, useNativeDriver: false })
    )).start();
  }, [data]);
  return (
    <View style={{ paddingLeft: 28 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 72, gap: 6 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <View style={{ width: '60%', height: '100%', justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
              <Animated.View style={{
                width: '100%', borderRadius: 4, backgroundColor: color,
                height: animVals[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }} />
            </View>
            <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>{d.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ position: 'absolute', left: 0, top: 18, height: 72, justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 9, color: '#d1d5db' }}>{max}</Text>
        <Text style={{ fontSize: 9, color: '#d1d5db' }}>{Math.round(max/2)}</Text>
        <Text style={{ fontSize: 9, color: '#d1d5db' }}>0</Text>
      </View>
    </View>
  );
};

const fmt = (n: number) => n >= 1000 ? (n/1000).toFixed(1)+'k' : String(n);
const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' }) : '—';

const DashboardScreen: React.FC = ({ navigation }: any) => {
  const { logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers:0, activeUsers:0, lockedUsers:0,
    totalChats:0, activeChats:0, totalBlocks:0,
    totalFriendships:0, pendingRequests:0,
    totalMessages:0, removedMessages:0,
  });
  const [recentRequests, setRecentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [allU, actU, locU, allC, actC, blk, fri, pendR, recR, allM, remM] = await Promise.all([
        DashAPI.getAccounts({ size:1 }),
        DashAPI.getAccounts({ size:1, status:1 }),
        DashAPI.getAccounts({ size:1, status:2 }),
        DashAPI.getChats({ size:1 }),
        DashAPI.getChats({ size:1, status:true }),
        DashAPI.getBlocks({ size:1 }),
        DashAPI.getFriendships({ size:1 }),
        DashAPI.getFriendRequests({ size:1, status:'PENDING' }),
        DashAPI.getFriendRequests({ size:5, ascSort:false }),
        DashAPI.getMessages({ size:1 }),
        DashAPI.getMessages({ size:1, status:false }),
      ]);
      const ex = (r: any): number => {
        const d = r?.data;
        if (!d) return 0;
        if (typeof d.totalElements === 'number') return d.totalElements;
        if (Array.isArray(d)) return d.length;
        return 0;
      };
      setStats({
        totalUsers: ex(allU), activeUsers: ex(actU), lockedUsers: ex(locU),
        totalChats: ex(allC), activeChats: ex(actC),
        totalBlocks: ex(blk), totalFriendships: ex(fri), pendingRequests: ex(pendR),
        totalMessages: ex(allM), removedMessages: ex(remM),
      });
      const d = recR?.data;
      setRecentRequests(Array.isArray(d) ? d : (d?.content ?? []));
    } catch (e) { console.error('Dashboard fetch error:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const statCards = [
    { icon:'👥', label:'Người dùng', value:fmt(stats.totalUsers), sub:`${fmt(stats.activeUsers)} active`, bg:'#eff6ff', border:'#bfdbfe', screen:'UserManagement' },
    { icon:'🔒', label:'Đã khoá',    value:fmt(stats.lockedUsers), bg:'#fef2f2', border:'#fecaca', screen:'UserManagement' },
    { icon:'💬', label:'Phòng chat', value:fmt(stats.totalChats), sub:`${fmt(stats.activeChats)} active`, bg:'#f0fdf4', border:'#bbf7d0', screen:'ChatManagement' },
    { icon:'📨', label:'Tin nhắn',   value:fmt(stats.totalMessages), sub:`${fmt(stats.removedMessages)} bị xoá`, bg:'#fdf4ff', border:'#e9d5ff', screen:'MessageManagement' },
    { icon:'🤝', label:'Bạn bè',     value:fmt(stats.totalFriendships), bg:'#fef9c3', border:'#fde68a', screen:'SocialManagement' },
    { icon:'🚫', label:'Block',      value:fmt(stats.totalBlocks), bg:'#fff7ed', border:'#fed7aa', screen:'SocialManagement' },
  ];

  const quickActions = [
    { icon:'👤', label:'Tài khoản', screen:'UserManagement', bg:'#eff6ff' },
    { icon:'💬', label:'Chat',      screen:'ChatManagement', bg:'#f0fdf4' },
    { icon:'📨', label:'Tin nhắn', screen:'MessageManagement', bg:'#fdf4ff' },
    { icon:'🌐', label:'Xã hội',   screen:'SocialManagement', bg:'#fff7ed' },
    { icon:'🚨', label:'Báo cáo',  screen:'ReportCenter',    bg:'#fef2f2' },
    { icon:'👤', label:'Hồ sơ',    screen:'Profile',         bg:'#f0fdf4' },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.hLeft}>
          <View style={s.logo}><Text style={{ fontSize:20 }}>🦉</Text></View>
          <View>
            <Text style={s.title}>OwlAdmin</Text>
            <View style={s.onlineRow}>
              <View style={s.onlineDot} />
              <Text style={s.onlineTxt}>SERVER ONLINE</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={s.iconBtn}><Text style={{ fontSize:20 }}>🔔</Text></TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={{ color:'#9ca3af', marginTop:8 }}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <ScrollView style={s.body} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}>

          {/* Stat cards */}
          <Text style={s.sectionTitle}>Tổng quan hệ thống</Text>
          <View style={s.statsGrid}>
            {statCards.map((c, i) => (
              <TouchableOpacity key={i}
                style={[s.statCard, { backgroundColor:c.bg, borderColor:c.border }]}
                onPress={() => navigation?.navigate(c.screen)} activeOpacity={0.7}>
                <Text style={{ fontSize:22, marginBottom:6 }}>{c.icon}</Text>
                <Text style={s.statVal}>{c.value}</Text>
                <Text style={s.statLbl}>{c.label}</Text>
                {c.sub && <Text style={s.statSub}>{c.sub}</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Alert strip */}
          {stats.pendingRequests > 0 && (
            <TouchableOpacity style={s.alert} onPress={() => navigation?.navigate('SocialManagement')}>
              <Text style={{ fontSize:18 }}>⏳</Text>
              <Text style={s.alertTxt}>
                <Text style={{ fontWeight:'700' }}>{stats.pendingRequests}</Text> lời mời kết bạn đang chờ duyệt
              </Text>
              <Text style={{ fontSize:16, color:'#854d0e' }}>→</Text>
            </TouchableOpacity>
          )}

          {/* Charts */}
          <Text style={s.sectionTitle}>Biểu đồ thống kê</Text>
          <View style={s.chartCard}>
            <MiniBarChart color="#3b82f6" label="Tài khoản người dùng"
              data={[
                { label:'Tổng',   value:stats.totalUsers },
                { label:'Active', value:stats.activeUsers },
                { label:'Khoá',   value:stats.lockedUsers },
              ]} />
            <View style={s.chartDiv} />
            <MiniBarChart color="#16a34a" label="Phòng chat"
              data={[
                { label:'Tổng',   value:stats.totalChats },
                { label:'Active', value:stats.activeChats },
                { label:'Khoá',   value:Math.max(0, stats.totalChats - stats.activeChats) },
              ]} />
            <View style={s.chartDiv} />
            <MiniBarChart color="#f97316" label="Mạng xã hội"
              data={[
                { label:'Bạn bè',  value:stats.totalFriendships },
                { label:'Chặn',    value:stats.totalBlocks },
                { label:'Chờ',     value:stats.pendingRequests },
              ]} />
          </View>

          {/* Quick actions */}
          <Text style={s.sectionTitle}>Truy cập nhanh</Text>
          <View style={s.actGrid}>
            {quickActions.map((a, i) => (
              <TouchableOpacity key={i}
                style={[s.actCard, { backgroundColor:a.bg }]}
                onPress={() => navigation?.navigate(a.screen)} activeOpacity={0.7}>
                <Text style={{ fontSize:24, marginBottom:5 }}>{a.icon}</Text>
                <Text style={s.actLbl}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Activity feed */}
          <Text style={s.sectionTitle}>Hoạt động gần đây</Text>
          {recentRequests.length === 0 ? (
            <View style={s.emptyFeed}>
              <Text style={{ fontSize:32, marginBottom:6 }}>📭</Text>
              <Text style={{ color:'#9ca3af', fontSize:13 }}>Không có hoạt động mới</Text>
            </View>
          ) : recentRequests.map((req, i) => (
            <View key={i} style={s.actItem}>
              <View style={s.actAvatar}>
                <Text style={s.actAvatarTxt}>{req.senderId?.charAt(0)?.toUpperCase() ?? '?'}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.actTxt} numberOfLines={1}>
                  <Text style={{ fontWeight:'bold', color:'#111827' }}>{req.senderId} </Text>
                  gửi kết bạn tới <Text style={{ fontWeight:'bold', color:'#111827' }}>{req.receiverId}</Text>
                </Text>
                <Text style={{ fontSize:10, color:'#9ca3af', marginTop:2 }}>{fmtDate(req.createdDate)}</Text>
              </View>
              <View style={[s.reqBadge,
                req.status==='PENDING' ? s.reqPending :
                req.status==='ACCEPTED' ? s.reqAccepted : s.reqRejected]}>
                <Text style={{ fontSize:13 }}>
                  {req.status==='PENDING' ? '⏳' : req.status==='ACCEPTED' ? '✅' : '❌'}
                </Text>
              </View>
            </View>
          ))}

          <View style={{ height:24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex:1, backgroundColor:'#16a34a' },
  loadingBox: { flex:1, backgroundColor:'#f3f4f6', justifyContent:'center', alignItems:'center' },
  header: { backgroundColor:'#16a34a', flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:16, paddingVertical:12 },
  hLeft: { flexDirection:'row', alignItems:'center', gap:10 },
  logo: { width:38, height:38, backgroundColor:'#fff', borderRadius:10, alignItems:'center', justifyContent:'center' },
  title: { color:'#fff', fontSize:18, fontWeight:'bold' },
  onlineRow: { flexDirection:'row', alignItems:'center', gap:4 },
  onlineDot: { width:6, height:6, borderRadius:3, backgroundColor:'#4ade80' },
  onlineTxt: { color:'#bbf7d0', fontSize:10, fontWeight:'600', letterSpacing:1 },
  iconBtn: { padding:4 },
  body: { flex:1, backgroundColor:'#f3f4f6' },
  sectionTitle: { fontSize:15, fontWeight:'bold', color:'#111827', paddingHorizontal:16, marginTop:16, marginBottom:10 },
  statsGrid: { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:12, gap:10 },
  statCard: { width:'47%', borderRadius:14, padding:14, borderWidth:1.5, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:4, elevation:2 },
  statVal: { fontSize:26, fontWeight:'bold', color:'#111827', marginBottom:2 },
  statLbl: { fontSize:12, color:'#6b7280', fontWeight:'500' },
  statSub: { fontSize:10, color:'#9ca3af', marginTop:2 },
  alert: { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:'#fef9c3', marginHorizontal:16, marginTop:12, borderRadius:12, padding:12, borderWidth:1, borderColor:'#fde68a' },
  alertTxt: { flex:1, fontSize:13, color:'#854d0e' },
  chartCard: { backgroundColor:'#fff', marginHorizontal:16, borderRadius:16, padding:16, gap:16, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:6, elevation:3 },
  chartDiv: { height:1, backgroundColor:'#f3f4f6' },
  actGrid: { flexDirection:'row', flexWrap:'wrap', paddingHorizontal:12, gap:10 },
  actCard: { borderRadius:14, padding:16, width:'30.5%', alignItems:'center', justifyContent:'center', shadowColor:'#000', shadowOpacity:0.03, shadowRadius:3, elevation:1 },
  actLbl: { fontSize:11, color:'#374151', fontWeight:'600', textAlign:'center' },
  actItem: { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', marginHorizontal:16, marginBottom:8, borderRadius:12, padding:12, shadowColor:'#000', shadowOpacity:0.03, shadowRadius:2, elevation:1 },
  actAvatar: { width:36, height:36, borderRadius:18, backgroundColor:'#dcfce7', alignItems:'center', justifyContent:'center', marginRight:10 },
  actAvatarTxt: { fontWeight:'bold', color:'#16a34a', fontSize:14 },
  actTxt: { fontSize:12, color:'#374151' },
  reqBadge: { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center' },
  reqPending: { backgroundColor:'#fef9c3' },
  reqAccepted: { backgroundColor:'#dcfce7' },
  reqRejected: { backgroundColor:'#fee2e2' },
  emptyFeed: { alignItems:'center', paddingVertical:20 },
});

export default DashboardScreen;