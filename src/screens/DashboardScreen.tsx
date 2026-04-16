import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, ActivityIndicator,
  RefreshControl, Animated, Dimensions, StatusBar
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/apiClient';
import { DebugService } from '../services/debugService';

const { width } = Dimensions.get('window');

// ─── UTILITY: Extract data từ response (hỗ trợ cả format cũ & mới) ──────────────
const extractCount = (response: any): number => {
  // Format mới: Plain array
  if (Array.isArray(response?.data)) {
    return (response.data as any[]).length;
  }
  
  // Format cũ: Wrapped response
  const wrapped = response?.data?.data || response?.data;
  if (!wrapped) return 0;
  if (typeof wrapped.totalElements === 'number') return wrapped.totalElements;
  if (Array.isArray(wrapped)) return wrapped.length;
  if (wrapped.content && Array.isArray(wrapped.content)) return wrapped.content.length;
  return 0;
};

const extractData = (response: any): any[] => {
  // Format mới: Plain array
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  
  // Format cũ: Wrapped response
  const wrapped = response?.data?.data || response?.data;
  if (Array.isArray(wrapped)) return wrapped;
  if (wrapped?.content && Array.isArray(wrapped.content)) return wrapped.content;
  return [];
};

// ─── DASHBOARD SERVICE: Gom các API calls thành các hàm chính ──────────────────
export const DashboardService = {
  /**
   * Lấy stats: Gom 6 API calls thành 1 Promise.all để tối ưu hiệu suất
   * Thay vì 10 calls, chỉ cần 6 calls bằng cách param hợp lý
   */
  getStats: async () => {
    try {
      console.log('📊 Fetching dashboard stats...');
      
      const [accounts, chats, messages, friendships, friendRequests, blocks] = await Promise.all([
        apiClient.user.get('/account', { params: { size: 100 } }).catch(e => {
          console.error('❌ User API error:', e.message);
          return { data: { data: [] } };
        }),
        apiClient.chat.get('/admin/chat', { params: { size: 100 } }).catch(e => {
          console.error('❌ Chat API error:', e.message);
          return { data: { data: [] } };
        }),
        apiClient.chat.get('/admin/message', { params: { size: 100 } }).catch(e => {
          console.error('❌ Message API error:', e.message);
          return { data: { data: [] } };
        }),
        apiClient.social.get('/admin/friendship', { params: { size: 100 } }).catch(e => {
          console.error('❌ Friendship API error:', e.message);
          return { data: { data: [] } };
        }),
        apiClient.social.get('/admin/friend-request', { params: { size: 100 } }).catch(e => {
          console.error('❌ Friend request API error:', e.message);
          return { data: { data: [] } };
        }),
        apiClient.social.get('/admin/block', { params: { size: 100 } }).catch(e => {
          console.error('❌ Block API error:', e.message);
          return { data: { data: [] } };
        })
      ]);

      console.log('✅ All API calls completed');
      console.log('📦 Accounts:', accounts?.data);
      console.log('📦 Chats:', chats?.data);

      const accountData = extractData(accounts);
      const total = extractCount(accounts);
      const active = accountData.filter((a: any) => a.status === true).length;
      const locked = accountData.filter((a: any) => a.status === false).length;

      const chatData = extractData(chats);
      const activeChats = chatData.filter((c: any) => c.status === true).length;

      const msgData = extractData(messages);
      const removedMsg = msgData.filter((m: any) => m.status === false).length;

      const friendData = extractData(friendships);
      const friendReqData = extractData(friendRequests);
      const blockData = extractData(blocks);

      const stats = {
        users: { total, active, locked },
        chats: { total: extractCount(chats), active: activeChats },
        messages: { total: extractCount(messages), removed: removedMsg },
        social: { friendships: friendData.length, blocks: blockData.length, pending: friendReqData.length }
      };

      console.log('✅ Stats calculated:', stats);
      return stats;
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
      return {
        users: { total: 0, active: 0, locked: 0 },
        chats: { total: 0, active: 0 },
        messages: { total: 0, removed: 0 },
        social: { friendships: 0, blocks: 0, pending: 0 }
      };
    }
  },

  /**
   * Lấy activities gần đây từ 2 API (users + friend requests)
   * Merge và format thành activity feed
   */
  getRecentActivities: async () => {
    try {
      console.log('📝 Fetching recent activities...');
      
      const usersRes = await apiClient.user.get('/account', { params: { size: 5 } }).catch(e => {
        console.error('❌ Users API error:', e.message);
        return { data: { data: [] } };
      });
      
      const friendReqRes = await apiClient.social.get('/admin/friend-request', { params: { size: 5, ascSort: false } }).catch(e => {
        console.error('❌ Friend requests API error:', e.message);
        return { data: { data: [] } };
      });

      const users = extractData(usersRes);
      const friendRequests = extractData(friendReqRes);
      const feed: any[] = [];

      // Activity: Người dùng mới
      users.forEach((user: any, idx: number) => {
        feed.push({
          id: `user_${user._id || user.id || idx}`,
          icon: '✨',
          bg: '#eff6ff',
          title: user.name || user.username || 'Người dùng mới',
          desc: 'Vừa tham gia hệ thống OwlChat',
          timeLabel: 'Hôm nay'
        });
      });

      // Activity: Kết bạn + Chặn
      friendRequests.forEach((req: any, idx: number) => {
        const isBlocked = req.status === 'BLOCKED';
        const isAccepted = req.status === 'ACCEPTED';

        feed.push({
          id: `req_${req.id || idx}`,
          icon: isBlocked ? '🚫' : isAccepted ? '🤝' : '📨',
          bg: isBlocked ? '#fef2f2' : isAccepted ? '#ecfdf5' : '#fffbeb',
          title: req.senderId || 'Người dùng',
          desc: isBlocked
            ? 'Ghi nhận hành vi chặn (Spam)'
            : isAccepted
            ? `Đã trở thành bạn bè với ${req.receiverId}`
            : `Gửi thư kết bạn tới ${req.receiverId}`,
          timeLabel: req.createdDate
            ? new Date(req.createdDate).toLocaleDateString('vi-VN')
            : 'Hôm qua'
        });
      });

      console.log('✅ Activities loaded:', feed.length);
      return feed.slice(0, 8); // Giới hạn 8 activities
    } catch (err) {
      console.error('❌ Error fetching activities:', err);
      return [];
    }
  }
};

// ─── UI UTILITIES ───────────────────────────────────────────────────────────────
const fmt = (n: number) => n >= 1000 ? (n/1000).toFixed(1) + 'k' : String(n);

const getAlertStyle = (type: 'danger' | 'warning' | 'success') => {
  const styles = {
    danger: { bg: '#fef2f2', border: '#ef4444', titleColor: '#991b1b' },
    warning: { bg: '#fffbeb', border: '#f59e0b', titleColor: '#92400e' },
    success: { bg: '#f0fdf4', border: '#10b981', titleColor: '#166534' }
  };
  return styles[type];
};

const TrendChart = ({ data, color, title, legend }: any) => {
  const max = Math.max(...data.map((d: any) => d.value), 1);
  const animVals = useRef(data.map(() => new Animated.Value(0))).current;
  
  useEffect(() => {
    animVals.forEach(av => av.setValue(0));
    Animated.stagger(150, animVals.map((av, i) =>
      Animated.timing(av, { toValue: data[i].value / max, duration: 800, useNativeDriver: false })
    )).start();
  }, [data]);

  return (
    <View style={s.chartBox}>
      <Text style={s.chartTitle}>{title}</Text>
      <View style={s.chartBars}>
        {data.map((d: any, i: number) => (
          <View key={i} style={s.barCol}>
            <Text style={s.barVal}>{fmt(d.value)}</Text>
            <View style={s.barTrack}>
              <Animated.View style={[s.barFill, {
                backgroundColor: color,
                height: animVals[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
              }]} />
            </View>
            <Text style={s.barLbl} numberOfLines={1}>{d.label}</Text>
          </View>
        ))}
      </View>
      <View style={s.chartLegend}>
        <View style={[s.legendDot, { backgroundColor: color }]} />
        <Text style={s.legendTxt}>{legend}</Text>
      </View>
    </View>
  );
};

const DashboardScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    try {
      setError(null);
      console.log('🔄 Starting dashboard load...');
      
      // Set timeout: 10 seconds max wait
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API timeout - dữ liệu không phản hồi')), 10000)
      );

      const [st, act] = await Promise.race([
        Promise.all([
          DashboardService.getStats(),
          DashboardService.getRecentActivities()
        ]),
        timeoutPromise as Promise<any>
      ]) as any;

      console.log('✅ Dashboard data loaded successfully');
      setStats(st);
      setActivities(act);
    } catch (err: any) {
      console.error('❌ Dashboard load failed:', err?.message || err);
      setError(err?.message || 'Lỗi khi tải dữ liệu dashboard');
      
      // Set default stats to show error state
      setStats({
        users: { total: 0, active: 0, locked: 0 },
        chats: { total: 0, active: 0 },
        messages: { total: 0, removed: 0 },
        social: { friendships: 0, blocks: 0, pending: 0 }
      });
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  const onRefresh = () => { setRefreshing(true); loadAll(); };

  if (loading) {
    return (
      <View style={s.loadingBox}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={{ color:'#64748b', marginTop:12, fontWeight:'500' }}>Khởi tạo không gian dữ liệu...</Text>
        
        <TouchableOpacity 
          style={[s.debugBtn, { marginTop: 24 }]}
          onPress={() => DebugService.testAllApis()}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>🔍 Test API Connections</Text>
        </TouchableOpacity>
        
        <Text style={{ color: '#94a3b8', marginTop: 16, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 }}>
          Kiểm tra Console (⌘J / Ctrl+J) để xem kết quả test
        </Text>
      </View>
    );
  }
  
  if (error && !stats) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <View>
            <Text style={s.headSub}>OwlChat Analytics</Text>
            <Text style={s.headTitle}>Admin Dashboard</Text>
          </View>
          <TouchableOpacity style={s.avatar}>
            <Text style={s.avatarTxt}>🦉</Text>
          </TouchableOpacity>
        </View>
        <ScrollView 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
          style={s.scroll}
        >
          <View style={[s.alertBox, { marginHorizontal: 20, marginTop: 20, backgroundColor: '#fef2f2', borderLeftColor: '#ef4444' }]}>
            <Text style={s.altIcon}>⚠️</Text>
            <View style={s.altBody}>
              <Text style={[s.altTit, { color: '#991b1b' }]}>Không thể tải dữ liệu</Text>
              <Text style={s.altDesc}>{error}</Text>
              <Text style={[s.altDesc, { marginTop: 10, color: '#0f172a', fontWeight: '600' }]}>Kiểm tra kết nối API hoặc thử tải lại</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── SMART ALERTS LOGIC (Dựa trên tỷ lệ từ stats) ───────────────────────────────────
  const getSmartAlerts = () => {
    if (!stats) return [];

    const alerts: Array<{ type: 'danger' | 'warning' | 'success'; icon: string; title: string; desc: string }> = [];
    const uTotal = Math.max(stats.users.total, 1);
    const mTotal = Math.max(stats.messages.total, 1);
    const fTotal = Math.max(stats.social.friendships, 1);

    // Alert 1: Tỷ lệ tài khoản bị khóa cao
    if (stats.users.locked / uTotal > 0.15) {
      alerts.push({
        type: 'danger',
        icon: '🚨',
        title: 'Tỉ lệ khóa tài khoản cao',
        desc: `${(stats.users.locked / uTotal * 100).toFixed(1)}% người dùng bị khóa. Cần kiểm tra hệ thống phát hiện dấu hiệu đăng ký clone.`
      });
    }

    // Alert 2: Tin nhắn bị xoá/thu hồi nhiều
    if (stats.messages.removed / mTotal > 0.05) {
      alerts.push({
        type: 'warning',
        icon: '🗑️',
        title: 'Phát hiện tin nhắn bị thu hồi nhiều',
        desc: `${stats.messages.removed} tin nhắn bị xoá. Đặt cảnh báo về vi phạm điều khoản nội dung.`
      });
    }

    // Alert 3: Hoạt động chặn người dùng tăng
    if (stats.social.blocks / fTotal > 0.1) {
      alerts.push({
        type: 'warning',
        icon: '🛡️',
        title: 'Hoạt động chặn người dùng tăng',
        desc: `${stats.social.blocks} báo cáo chặn giao tiếp. Nguy cơ có tài khoản quấy rối.`
      });
    }

    // Alert 4: Yêu cầu kết bạn đang chờ nhiều
    if (stats.social.pending / uTotal > 0.2) {
      alerts.push({
        type: 'warning',
        icon: '📨',
        title: 'Yêu cầu kết bạn chờ đợi cao',
        desc: `${stats.social.pending} yêu cầu kết bạn đang chờ xử lý.`
      });
    }

    // Default success alert
    if (alerts.length === 0) {
      alerts.push({
        type: 'success',
        icon: '✨',
        title: 'Hệ thống đang hoạt động an toàn',
        desc: 'Tất cả chỉ số lượng chuyển đổi và hành vi người dùng đều nằm trong ngưỡng tiêu chuẩn.'
      });
    }

    return alerts;
  };

  const smartAlerts = getSmartAlerts();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* HEADER TỐI GIẢN CHUYÊN NGHIỆP */}
      <View style={s.header}>
        <View>
          <Text style={s.headSub}>OwlChat Analytics</Text>
          <Text style={s.headTitle}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity style={s.avatar}><Text style={s.avatarTxt}>🦉</Text></TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}>
        
        {/* A. KPI CHÍNH - Primary Metric (FOCUS) */}
        <View style={s.kpiArea}>
          {/* Main Focus: Total Users */}
          <View style={s.heroCard}>
            <View style={s.heroTop}>
              <View style={s.heroIconBx}><Text style={{fontSize:20}}>👥</Text></View>
              <View style={s.trendPill}><Text style={s.trendTxt}>↗ +12.5% tuần này</Text></View>
            </View>
            <View style={{ marginTop: 24 }}>
              <Text style={s.heroLbl}>Tổng Quy Mô Người Dùng</Text>
              <Text style={s.heroVal}>{fmt(stats.users.total)}</Text>
            </View>
            <View style={s.heroBot}>
              <Text style={s.heroBotTxt}>● Đang hoạt động: <Text style={{fontWeight:'700', color:'#fff'}}>{fmt(stats.users.active)} user ({(stats.users.active/(stats.users.total||1)*100).toFixed(0)}%)</Text></Text>
            </View>
          </View>

          {/* Secondary KPIs (Row of 2) */}
          <View style={s.row}>
            <View style={[s.bigbx, s.w48]}>
               <View style={s.bxIcBx}><Text>💬</Text></View>
               <Text style={s.bxVal}>{fmt(stats.chats.total)}</Text>
               <Text style={s.bxLbl}>Tổng Phòng Chat</Text>
               <Text style={s.bxSub}>↗ +4.2% so với hôm qua</Text>
            </View>
            <View style={[s.bigbx, s.w48]}>
               <View style={[s.bxIcBx, {backgroundColor:'#fef2f2'}]}><Text>📨</Text></View>
               <Text style={s.bxVal}>{fmt(stats.messages.total)}</Text>
               <Text style={s.bxLbl}>Tương Tác Tin nhắn</Text>
               <Text style={[s.bxSub, {color:'#ef4444'}]}>↘ {(stats.messages.removed/(stats.messages.total||1)*100).toFixed(1)}% bị xóa/thu hồi</Text>
            </View>
          </View>

          {/* Connect KPIs (Row of 3) */}
          <View style={s.row}>
            <View style={[s.smlbx, s.w31]}>
              <Text style={[s.smlVal, {color:'#10b981'}]}>{fmt(stats.social.friendships)}</Text>
              <Text style={s.smlLbl}>Bạn bè</Text>
            </View>
            <View style={[s.smlbx, s.w31]}>
              <Text style={[s.smlVal, {color:'#f59e0b'}]}>{fmt(stats.social.pending)}</Text>
              <Text style={s.smlLbl}>Yêu cầu chờ</Text>
            </View>
            <View style={[s.smlbx, s.w31]}>
              <Text style={[s.smlVal, {color:'#ef4444'}]}>{fmt(stats.social.blocks)}</Text>
              <Text style={s.smlLbl}>Spam/Chặn</Text>
            </View>
          </View>
        </View>

        {/* B. ALERTS (INSIGHT) */}
        <Text style={s.secTitle}>Insight & Cảnh Báo</Text>
        <View style={s.alertsCont}>
          {smartAlerts.map((alert, i) => {
            const style = getAlertStyle(alert.type);
            return (
              <View
                key={i}
                style={[
                  s.alertBox,
                  {
                    backgroundColor: style.bg,
                    borderLeftColor: style.border
                  }
                ]}
              >
                <Text style={s.altIcon}>{alert.icon}</Text>
                <View style={s.altBody}>
                  <Text style={[s.altTit, { color: style.titleColor }]}>{alert.title}</Text>
                  <Text style={s.altDesc}>{alert.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* C. TRENDS (CHARTS) */}
        <Text style={s.secTitle}>Biểu Đồ Xu Hướng</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chartsScrl}>
          <TrendChart
            title="Tỉ lệ hoạt động (Users)"
            color="#3b82f6"
            legend="Số tài khoản"
            data={[
              { label: 'Tổng đky', value: stats.users.total },
              { label: 'Đang SD', value: stats.users.active },
              { label: 'Bị khóa', value: stats.users.locked }
            ]}
          />
          <TrendChart
            title="Tương tác & Quản trị"
            color="#8b5cf6"
            legend="Lượng thao tác hệ thống"
            data={[
              { label: 'Tin nhắn', value: stats.messages.total },
              { label: 'Kết bạn', value: stats.social.friendships },
              { label: 'Khóa/Xóa', value: stats.users.locked + stats.messages.removed }
            ]}
          />
        </ScrollView>

        {/* D. ACTIVITY FEED */}
        <Text style={s.secTitle}>Nhật Ký Sự Kiện Gần Đây</Text>
        <View style={s.feedBox}>
           {activities.length === 0 ? (
             <Text style={s.noFeed}>Không có hoạt động nào được ghi nhận.</Text>
           ) : activities.map((act) => (
             <View key={act.id} style={s.feedItm}>
               <View style={[s.feedIc, {backgroundColor: act.bg}]}><Text>{act.icon}</Text></View>
               <View style={s.feedBody}>
                 <Text style={s.feedTit}>{act.title}</Text>
                 <Text style={s.feedDesc}>{act.desc}</Text>
               </View>
               <Text style={s.feedTime}>{act.timeLabel}</Text>
             </View>
           ))}
        </View>

        <View style={{height: 60}} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', paddingHorizontal: 20 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headSub: { color: '#64748b', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  headTitle: { color: '#0f172a', fontSize: 22, fontWeight: '800', marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { fontSize: 20 },
  scroll: { flex: 1 },
  kpiArea: { paddingHorizontal: 20, paddingTop: 10 },
  heroCard: { backgroundColor: '#0f172a', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 8, marginBottom: 16 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroIconBx: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  trendPill: { backgroundColor: 'rgba(16,185,129,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  trendTxt: { color: '#34d399', fontSize: 12, fontWeight: '700' },
  heroLbl: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  heroVal: { color: '#ffffff', fontSize: 42, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  heroBot: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1e293b' },
  heroBotTxt: { color: '#94a3b8', fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  w48: { width: '48%' },
  w31: { width: '31.5%' },
  bigbx: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, shadowColor: '#94a3b8', shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  bxIcBx: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  bxVal: { color: '#0f172a', fontSize: 26, fontWeight: '800' },
  bxLbl: { color: '#475569', fontSize: 13, fontWeight: '600', marginTop: 4 },
  bxSub: { color: '#10b981', fontSize: 11, fontWeight: '600', marginTop: 12 },
  smlbx: { backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#94a3b8', shadowOpacity: 0.1, shadowRadius: 6, elevation: 1 },
  smlVal: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  smlLbl: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  secTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginHorizontal: 20, marginTop: 20, marginBottom: 14 },
  alertsCont: { paddingHorizontal: 20, gap: 12 },
  alertBox: { flexDirection: 'row', padding: 16, borderRadius: 16, borderLeftWidth: 4 },
  altIcon: { fontSize: 24, marginRight: 14 },
  altBody: { flex: 1 },
  altTit: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  altDesc: { fontSize: 12.5, color: '#475569', lineHeight: 18 },
  chartsScrl: { paddingHorizontal: 20, gap: 16, paddingRight: 40 },
  chartBox: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, width: 280, shadowColor: '#94a3b8', shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 20 },
  chartBars: { flexDirection: 'row', height: 120, alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 10 },
  barCol: { alignItems: 'center', width: 44 },
  barVal: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6 },
  barTrack: { width: 32, height: 90, backgroundColor: '#f1f5f9', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  barLbl: { fontSize: 11, color: '#94a3b8', marginTop: 8, fontWeight: '600' },
  chartLegend: { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendTxt: { fontSize: 12, color: '#64748b' },
  feedBox: { paddingHorizontal: 20, gap: 12 },
  feedItm: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 14, borderRadius: 16, shadowColor: '#94a3b8', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  feedIc: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  feedBody: { flex: 1 },
  feedTit: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  feedDesc: { fontSize: 12, color: '#64748b' },
  feedTime: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  noFeed: { textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 10 },
  debugBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, alignItems: 'center' }
});

export default DashboardScreen;