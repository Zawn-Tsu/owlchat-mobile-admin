import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, RefreshControl,
  Alert, Modal, ScrollView,
} from 'react-native';
import { apiClient } from '../services/apiClient';

interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  createdDate?: string;
}

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type ActionType = 'WARNING' | 'MUTE' | 'BAN' | 'NONE';

const SEVERITY_CFG: Record<Severity, { label: string; bg: string; text: string; border: string }> = {
  LOW:      { label: '🟢 Thấp',      bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  MEDIUM:   { label: '🟡 Trung bình', bg: '#fef9c3', text: '#854d0e', border: '#fde68a' },
  HIGH:     { label: '🟠 Cao',        bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  CRITICAL: { label: '🔴 Nguy hiểm',  bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

export const ReportAPI = {
  // ─── SOCIAL ───────────────────────────
  getBlocks: (params?: Record<string, any>) =>
    apiClient.social.get('/admin/block', { params }),

  deleteBlock: (id: string) =>
    apiClient.social.delete(`/admin/block/${id}`),

  // ─── USER ─────────────────────────────
  updateAccountStatus: (id: string, status: boolean) =>
    apiClient.user.patch(`/account/${id}/status/${status}`, {}),
};

const SeverityBadge = ({ severity }: { severity: Severity }) => {
  const c = SEVERITY_CFG[severity];
  return (
    <View style={[styles.severityBadge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.severityText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
};

const ReportDetailModal = ({
  visible, block, severity, onClose, onSetSeverity, onAction,
}: {
  visible: boolean; block: Block | null; severity: Severity;
  onClose: () => void; onSetSeverity: (s: Severity) => void;
  onAction: (action: ActionType, id: string) => void;
}) => {
  if (!block) return null;
  const severities: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.reportIconCircle}><Text style={{ fontSize: 28 }}>🚨</Text></View>
            <Text style={styles.modalTitle}>Chi tiết báo cáo</Text>
            <SeverityBadge severity={severity} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
            <View style={styles.infoCard}>
              {[
                { label: '🚫 Người bị báo cáo', value: block.blockedId },
                { label: '📢 Người báo cáo',    value: block.blockerId },
                { label: '🆔 Block ID',          value: block.id },
                { label: '📅 Ngày báo cáo',      value: block.createdDate ? new Date(block.createdDate).toLocaleString('vi-VN') : '—' },
              ].map((r, i, arr) => (
                <View key={i} style={[styles.infoRow, i < arr.length - 1 && styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>{r.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{r.value}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Mức độ nguy hiểm</Text>
            <View style={styles.severityGrid}>
              {severities.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.severityOption,
                    { backgroundColor: SEVERITY_CFG[s].bg, borderColor: SEVERITY_CFG[s].border },
                    severity === s && styles.severityOptionSelected]}
                  onPress={() => onSetSeverity(s)}
                >
                  <Text style={[styles.severityOptionText, { color: SEVERITY_CFG[s].text }]}>
                    {SEVERITY_CFG[s].label}
                  </Text>
                  {severity === s && <Text style={{ fontSize: 10, color: SEVERITY_CFG[s].text }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Xử lý vi phạm</Text>
            <View style={styles.actionGroup}>
              {[
                { action: 'WARNING' as ActionType, icon: '⚠️', title: 'Cảnh cáo user',    sub: 'Ghi nhận, không khoá tài khoản',     style: styles.actionBtnInfo,    textColor: '#1d4ed8' },
                { action: 'MUTE'    as ActionType, icon: '🔇', title: 'Mute user',         sub: 'Vô hiệu hoá tài khoản tạm thời',    style: styles.actionBtnWarn,    textColor: '#c2410c' },
                { action: 'BAN'     as ActionType, icon: '🔨', title: 'Ban user',          sub: 'Khoá tài khoản vĩnh viễn',           style: styles.actionBtnDanger,  textColor: '#dc2626' },
                { action: 'NONE'    as ActionType, icon: '🗑️', title: 'Bỏ qua báo cáo',   sub: 'Xoá khỏi danh sách',                style: styles.actionBtnNeutral, textColor: '#6b7280' },
              ].map(({ action, icon, title, sub, style: btnStyle, textColor }) => (
                <TouchableOpacity
                  key={action}
                  style={[styles.actionBtn, btnStyle]}
                  onPress={() => onAction(action, action === 'NONE' ? block.id : block.blockedId)}
                >
                  <Text style={styles.actionBtnIcon}>{icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.actionBtnTitle, { color: textColor }]}>{title}</Text>
                    <Text style={styles.actionBtnSub}>{sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 8 }} />
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const ReportCenterScreen: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [severityMap, setSeverityMap] = useState<Record<string, Severity>>({});
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [selected, setSelected] = useState<Block | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const PAGE_SIZE = 20;

  useEffect(() => { loadBlocks(0, true); }, []);

  const loadBlocks = async (pageNum = 0, reset = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await ReportAPI.getBlocks({ page: pageNum, size: PAGE_SIZE, ascSort: false });
      const responseData = extractData(res);
      const data: Block[] = Array.isArray(responseData) ? responseData : (responseData?.content ?? []);
      const newMap = { ...severityMap };
      data.forEach(b => { if (!newMap[b.id]) newMap[b.id] = 'LOW'; });
      setSeverityMap(newMap);
      if (reset || pageNum === 0) setBlocks(data);
      else setBlocks(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  };

  const handleSetSeverity = (blockId: string, s: Severity) =>
    setSeverityMap(prev => ({ ...prev, [blockId]: s }));

  const handleAction = async (action: ActionType, targetId: string) => {
    if (action === 'WARNING') {
      Alert.alert('✅ Đã cảnh cáo', `Ghi nhận cảnh cáo cho user ${targetId}.`);
      setModalVisible(false);
      return;
    }
    if (action === 'NONE') {
      Alert.alert('Bỏ qua báo cáo', 'Xoá báo cáo khỏi danh sách?', [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xoá', onPress: async () => {
          try {
            await ReportAPI.deleteBlock(targetId);
            setBlocks(prev => prev.filter(b => b.id !== targetId));
            setModalVisible(false);
          } catch { Alert.alert('Lỗi', 'Không thể xoá.'); }
        }},
      ]);
      return;
    }
    const isBan = action === 'BAN';
    Alert.alert(
      isBan ? '🔨 Ban user' : '🔇 Mute user',
      `${isBan ? 'Khoá vĩnh viễn' : 'Vô hiệu hoá'} tài khoản ${targetId}?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        { text: isBan ? 'Ban' : 'Mute', style: 'destructive', onPress: async () => {
          try {
            await ReportAPI.updateAccountStatus(targetId, false);
            Alert.alert('Thành công', `Đã ${isBan ? 'ban' : 'mute'} user.`);
            setModalVisible(false);
          } catch { Alert.alert('Lỗi', 'Không thể xử lý tài khoản này.'); }
        }},
      ]
    );
  };

  const filtered = severityFilter
    ? blocks.filter(b => (severityMap[b.id] ?? 'LOW') === severityFilter)
    : blocks;

  const criticalCount = blocks.filter(b => severityMap[b.id] === 'CRITICAL').length;
  const highCount = blocks.filter(b => severityMap[b.id] === 'HIGH').length;

  const renderItem = ({ item }: { item: Block }) => {
    const sev: Severity = severityMap[item.id] ?? 'LOW';
    const cfg = SEVERITY_CFG[sev];
    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: cfg.border, borderLeftWidth: 4 }]}
        onPress={() => { setSelected(item); setModalVisible(true); }}
        activeOpacity={0.7}
      >
        <View style={[styles.reportIcon, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 20 }}>🚨</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={styles.cardReported} numberOfLines={1}>
              Bị bc: <Text style={{ color: '#111827', fontWeight: '700' }}>{item.blockedId}</Text>
            </Text>
            <SeverityBadge severity={sev} />
          </View>
          <Text style={styles.cardReporter} numberOfLines={1}>Người bc: {item.blockerId}</Text>
          <Text style={styles.cardDate}>
            {item.createdDate ? new Date(item.createdDate).toLocaleDateString('vi-VN') : '—'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.cycleBtn, { backgroundColor: cfg.bg }]}
          onPress={() => {
            const levels: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
            handleSetSeverity(item.id, levels[(levels.indexOf(sev) + 1) % levels.length]);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 16 }}>⚡</Text>
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
            <Text style={styles.headerTitle}>Report Center</Text>
            <Text style={styles.headerSub}>Quản lý báo cáo vi phạm</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      {!loading && (
        <View style={styles.statsBar}>
          {[
            { num: blocks.length, label: 'Tổng báo cáo', color: '#111827' },
            { num: criticalCount, label: '🔴 Nguy hiểm',  color: '#dc2626' },
            { num: highCount,     label: '🟠 Mức cao',    color: '#c2410c' },
          ].map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Filters */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        {([['', 'Tất cả'], ['CRITICAL', '🔴 Nguy hiểm'], ['HIGH', '🟠 Cao'], ['MEDIUM', '🟡 Trung bình'], ['LOW', '🟢 Thấp']] as [Severity | '', string][]).map(([val, label]) => (
          <TouchableOpacity
            key={val}
            style={[styles.filterPill, severityFilter === val && styles.filterPillActive]}
            onPress={() => setSeverityFilter(val)}
          >
            <Text style={[styles.filterText, severityFilter === val && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.noticeBanner}>
        <Text style={styles.noticeText}>💡 Nhấn ⚡ để đổi mức độ nhanh. Nhấn card để xử lý.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBlocks(0, true); }} colors={['#16a34a']} />}
          onEndReached={() => { if (!loadingMore && hasMore) loadBlocks(page + 1); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#16a34a" style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>Không có báo cáo nào</Text>
              <Text style={styles.emptyText}>Cộng đồng đang hoạt động lành mạnh!</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ReportDetailModal
        visible={modalVisible}
        block={selected}
        severity={selected ? (severityMap[selected.id] ?? 'LOW') : 'LOW'}
        onClose={() => setModalVisible(false)}
        onSetSeverity={s => { if (selected) handleSetSeverity(selected.id, s); }}
        onAction={handleAction}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#16a34a' },
  header: { backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 18 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  headerSub: { color: '#bbf7d0', fontSize: 11 },
  statsBar: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: 'bold' },
  statLbl: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: '#f3f4f6' },
  filterRow: { backgroundColor: '#f3f4f6' },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  filterPillActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  noticeBanner: { backgroundColor: '#fef9c3', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#fde68a' },
  noticeText: { fontSize: 12, color: '#854d0e' },
  loadingBox: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  list: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  reportIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardBody: { flex: 1, gap: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardReported: { fontSize: 12, color: '#6b7280', flex: 1 },
  cardReporter: { fontSize: 12, color: '#374151' },
  cardDate: { fontSize: 11, color: '#9ca3af' },
  cycleBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  severityText: { fontSize: 10, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#9ca3af' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { alignItems: 'center', marginBottom: 16, gap: 8 },
  reportIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  infoCard: { backgroundColor: '#f9fafb', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 12, color: '#111827', fontWeight: '600', flex: 2, textAlign: 'right' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  severityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  severityOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, width: '47%' },
  severityOptionSelected: { borderWidth: 2.5 },
  severityOptionText: { fontSize: 12, fontWeight: '700' },
  actionGroup: { gap: 10, marginBottom: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, borderWidth: 1 },
  actionBtnIcon: { fontSize: 22 },
  actionBtnTitle: { fontSize: 14, fontWeight: '700' },
  actionBtnSub: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  actionBtnInfo: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  actionBtnWarn: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  actionBtnDanger: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  actionBtnNeutral: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  closeBtn: { marginTop: 8, marginBottom: 4, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});

export default ReportCenterScreen;