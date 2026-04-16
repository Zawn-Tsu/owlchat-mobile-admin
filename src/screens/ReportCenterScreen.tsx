import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, RefreshControl,
  Alert, Modal, ScrollView, TextInput,
} from 'react-native';
import { apiClient } from '../services/apiClient';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type ReportAction = 'WARNING' | 'REMOVE_MESSAGE' | 'BAN_SENDER' | 'DISMISS';

interface MessageReport {
  id: string;
  messageId: string;
  reporterId: string;
  content: string;
  createdDate?: string;
}

interface MessageDetail {
  id: string;
  chatId?: string;
  senderId?: string;
  content?: string;
  type?: string;
  status?: boolean;
  state?: string;
  sentDate?: string;
  createdDate?: string;
}

const PAGE_SIZE = 20;

const extractArray = <T,>(response: any): T[] => {
  const data = response?.data?.data ?? response?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

const ReportAPI = {
  getReports: (params: Record<string, any>) =>
    apiClient.chat.get('/admin/report', { params }),

  getMessage: (messageId: string) =>
    apiClient.chat.get(`/admin/message/${messageId}`),

  removeMessage: (messageId: string) =>
    apiClient.chat.delete(`/admin/message/${messageId}/remove`),

  deleteReport: (reportId: string) =>
    apiClient.chat.delete(`/admin/report/${reportId}`),

  updateAccountStatus: (accountId: string, status: boolean) =>
    apiClient.user.patch(`/account/${accountId}/status/${status}`, {}),
};

const SEVERITY_CFG: Record<Severity, { label: string; shortLabel: string; bg: string; text: string; border: string }> = {
  LOW: { label: 'Thấp', shortLabel: 'Thấp', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  MEDIUM: { label: 'Trung bình', shortLabel: 'TB', bg: '#fef9c3', text: '#854d0e', border: '#fde68a' },
  HIGH: { label: 'Cao', shortLabel: 'Cao', bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  CRITICAL: { label: 'Nguy hiểm', shortLabel: 'Nguy hiểm', bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

const severityByContent = (content = ''): Severity => {
  const text = content.toLowerCase();
  if (/(đe doạ|đe dọa|bạo lực|giết|lừa đảo|scam|sex|tình dục|khủng bố)/i.test(text)) return 'CRITICAL';
  if (/(spam|quấy rối|xúc phạm|chửi|hate|toxic|hack)/i.test(text)) return 'HIGH';
  if (text.length > 80) return 'MEDIUM';
  return 'LOW';
};

const formatTime = (dateStr?: string) => {
  if (!dateStr) return 'Chưa có';
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortenId = (id?: string) => {
  if (!id) return 'Chưa có';
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
};

const SeverityBadge = ({ severity }: { severity: Severity }) => {
  const cfg = SEVERITY_CFG[severity];
  return (
    <View style={[styles.severityBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[styles.severityText, { color: cfg.text }]}>{cfg.shortLabel}</Text>
    </View>
  );
};

const ReportDetailModal = ({
  visible,
  report,
  severity,
  message,
  messageLoading,
  onClose,
  onSetSeverity,
  onAction,
}: {
  visible: boolean;
  report: MessageReport | null;
  severity: Severity;
  message: MessageDetail | null;
  messageLoading: boolean;
  onClose: () => void;
  onSetSeverity: (severity: Severity) => void;
  onAction: (action: ReportAction) => void;
}) => {
  if (!report) return null;

  const messageRemoved = message?.state === 'REMOVED' || message?.status === false;
  const rows = [
    { label: 'Report ID', value: report.id },
    { label: 'Message ID', value: report.messageId },
    { label: 'Người báo cáo', value: report.reporterId },
    { label: 'Người gửi tin', value: messageLoading ? 'Đang tải...' : message?.senderId || 'Chưa tải được' },
    { label: 'Chat ID', value: message?.chatId || 'Chưa có' },
    { label: 'Thời gian', value: formatTime(report.createdDate) },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalIcon}><Text style={styles.modalIconText}>!</Text></View>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>Chi tiết báo cáo</Text>
              <Text style={styles.modalSubtitle}>{formatTime(report.createdDate)}</Text>
            </View>
            <SeverityBadge severity={severity} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalContent}>
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Nội dung báo cáo</Text>
              <Text style={styles.reasonText}>{report.content || 'Không có mô tả'}</Text>
            </View>

            <View style={styles.messagePreview}>
              <Text style={styles.reasonLabel}>Tin nhắn bị báo cáo</Text>
              {messageLoading ? (
                <ActivityIndicator color="#16a34a" style={styles.messageLoader} />
              ) : (
                <>
                  <Text style={[styles.messageText, messageRemoved && styles.messageRemovedText]} numberOfLines={5}>
                    {messageRemoved ? 'Tin nhắn đã bị ẩn/xoá mềm' : message?.content || 'Không tải được nội dung tin nhắn'}
                  </Text>
                  <View style={styles.messageMetaRow}>
                    <Text style={styles.messageMeta}>{message?.type || 'UNKNOWN'}</Text>
                    <Text style={styles.messageMeta}>Sender: {shortenId(message?.senderId)}</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.infoCard}>
              {rows.map((row, index) => (
                <View key={row.label} style={[styles.infoRow, index < rows.length - 1 && styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue} numberOfLines={2}>{row.value}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Mức độ xử lý</Text>
            <View style={styles.severityGrid}>
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Severity[]).map(level => {
                const cfg = SEVERITY_CFG[level];
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.severityOption,
                      { backgroundColor: cfg.bg, borderColor: cfg.border },
                      severity === level && styles.severityOptionActive,
                    ]}
                    onPress={() => onSetSeverity(level)}
                  >
                    <Text style={[styles.severityOptionText, { color: cfg.text }]}>{cfg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Thao tác</Text>
            <View style={styles.actionGroup}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnInfo]} onPress={() => onAction('WARNING')}>
                <Text style={styles.actionTitle}>Ghi nhận cảnh cáo</Text>
                <Text style={styles.actionSub}>Không thay đổi dữ liệu, chỉ đóng phiên xử lý.</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnWarn]} onPress={() => onAction('REMOVE_MESSAGE')}>
                <Text style={[styles.actionTitle, styles.actionWarnText]}>Ẩn tin nhắn</Text>
                <Text style={styles.actionSub}>Tin nhắn sẽ bị ẩn khỏi tất cả người dùng.</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger, !message?.senderId && styles.actionDisabled]}
                disabled={!message?.senderId}
                onPress={() => onAction('BAN_SENDER')}
              >
                <Text style={[styles.actionTitle, styles.actionDangerText]}>Khoá tài khoản người gửi</Text>
                <Text style={styles.actionSub}>{message?.senderId ? 'Khoá vĩnh viễn tài khoản này' : 'Chưa tải được ID người gửi'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnNeutral]} onPress={() => onAction('DISMISS')}>
                <Text style={styles.actionTitle}>Xoá report khỏi hàng đợi</Text>
                <Text style={styles.actionSub}>Report sẽ không thể khôi phục lại.</Text>
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

const ReportCenterScreen: React.FC = () => {
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('');
  const [severityMap, setSeverityMap] = useState<Record<string, Severity>>({});
  const [selectedReport, setSelectedReport] = useState<MessageReport | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSeverityFilter('');
    loadReports(0, true);
  }, [debouncedSearch]);

  const loadReports = async (pageNum = 0, reset = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const params: Record<string, any> = {
        page: pageNum,
        pageSize: PAGE_SIZE,
        ascSort: false,
      };
      if (debouncedSearch) params.keywords = debouncedSearch;

      const response = await ReportAPI.getReports(params);
      const data = extractArray<MessageReport>(response);

      setSeverityMap(prev => {
        const next = { ...prev };
        data.forEach(report => {
          if (!next[report.id]) next[report.id] = severityByContent(report.content);
        });
        return next;
      });

      setReports(prev => (reset || pageNum === 0 ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (error) {
      console.error('Load reports error:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách báo cáo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const openReport = async (report: MessageReport) => {
    setSelectedReport(report);
    setSelectedMessage(null);
    setDetailVisible(true);
    setMessageLoading(true);

    try {
      const response = await ReportAPI.getMessage(report.messageId);
      setSelectedMessage(response?.data?.data ?? response?.data ?? null);
    } catch (error) {
      console.error('Load reported message error:', error);
      setSelectedMessage(null);
    } finally {
      setMessageLoading(false);
    }
  };

  const setReportSeverity = (reportId: string, severity: Severity) => {
    setSeverityMap(prev => ({ ...prev, [reportId]: severity }));
  };

  const removeReportFromList = (reportId: string) => {
    setReports(prev => prev.filter(report => report.id !== reportId));
    setSeverityMap(prev => {
      const next = { ...prev };
      delete next[reportId];
      return next;
    });
  };

  const deleteReport = async (reportId: string) => {
    await ReportAPI.deleteReport(reportId);
    removeReportFromList(reportId);
    setDetailVisible(false);
  };

  const handleAction = async (action: ReportAction) => {
    if (!selectedReport) return;

    if (action === 'WARNING') {
      Alert.alert('✅ Đã ghi nhận', 'Report đã được đánh dấu là đã cảnh cáo.');
      setDetailVisible(false);
      return;
    }

    if (action === 'REMOVE_MESSAGE') {
      Alert.alert('Ẩn tin nhắn', 'Tin nhắn sẽ bị xoá mềm và ẩn khỏi người dùng.', [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Ẩn tin nhắn',
          style: 'destructive',
          onPress: async () => {
            setLoadingAction(true);
            try {
              await ReportAPI.removeMessage(selectedReport.messageId);
              await deleteReport(selectedReport.id);
              Alert.alert('✅ Thành công', 'Đã ẩn tin nhắn và xoá report khỏi hàng đợi.');
            } catch (e) {
              Alert.alert('❌ Lỗi', 'Không thể ẩn tin nhắn.');
              console.error(e);
            } finally {
              setLoadingAction(false);
            }
          },
        },
      ]);
      return;
    }

    if (action === 'BAN_SENDER') {
      const senderId = selectedMessage?.senderId;
      if (!senderId) {
        Alert.alert('Thiếu dữ liệu', 'Không tải được senderId của tin nhắn.');
        return;
      }

      Alert.alert('Khoá tài khoản', `Khoá tài khoản ${senderId}?`, [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Khoá',
          style: 'destructive',
          onPress: async () => {
            setLoadingAction(true);
            try {
              await ReportAPI.updateAccountStatus(senderId, false);
              await ReportAPI.removeMessage(selectedReport.messageId).catch(() => undefined);
              await deleteReport(selectedReport.id);
              Alert.alert('✅ Thành công', 'Đã khoá tài khoản và đóng report.');
            } catch (e) {
              Alert.alert('❌ Lỗi', 'Không thể khoá tài khoản này.');
              console.error(e);
            } finally {
              setLoadingAction(false);
            }
          },
        },
      ]);
      return;
    }

    Alert.alert('Xoá report', 'Xoá report khỏi hàng đợi xử lý?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          setLoadingAction(true);
          try {
            await deleteReport(selectedReport.id);
            Alert.alert('✅ Thành công', 'Đã xoá report.');
          } catch (e) {
            Alert.alert('❌ Lỗi', 'Không thể xoá report.');
            console.error(e);
          } finally {
            setLoadingAction(false);
          }
        },
      },
    ]);
  };

  const filteredReports = useMemo(() => {
    if (!severityFilter) return reports;
    return reports.filter(report => (severityMap[report.id] ?? severityByContent(report.content)) === severityFilter);
  }, [reports, severityFilter, severityMap]);

  const stats = useMemo(() => {
    const total = reports.length;
    const high = reports.filter(report => severityMap[report.id] === 'HIGH').length;
    const critical = reports.filter(report => severityMap[report.id] === 'CRITICAL').length;
    return { total, high, critical };
  }, [reports, severityMap]);

  const renderItem = ({ item }: { item: MessageReport }) => {
    const severity = severityMap[item.id] ?? severityByContent(item.content);
    const cfg = SEVERITY_CFG[severity];

    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftColor: cfg.border }]}
        onPress={() => openReport(item)}
        activeOpacity={0.75}
      >
        <View style={[styles.reportMark, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.reportMarkText, { color: cfg.text }]}>!</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>Tin nhắn {shortenId(item.messageId)}</Text>
            <SeverityBadge severity={severity} />
          </View>
          <Text style={styles.cardContent} numberOfLines={2}>{item.content || 'Không có mô tả báo cáo'}</Text>
          <View style={styles.cardBottomRow}>
            <Text style={styles.cardMeta} numberOfLines={1}>Reporter: {shortenId(item.reporterId)}</Text>
            <Text style={styles.cardDate}>{formatTime(item.createdDate)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.quickSeverityBtn, { backgroundColor: cfg.bg }]}
          onPress={() => {
            const levels: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
            const next = levels[(levels.indexOf(severity) + 1) % levels.length];
            setReportSeverity(item.id, next);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          title="Đổi mức độ"
        >
          <Text style={[styles.quickSeverityText, { color: cfg.text }]}>🔄</Text>
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
            <Text style={styles.headerTitle}>Trung tâm báo cáo</Text>
            <Text style={styles.headerSub}>Report tin nhắn từ chat-service</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm report, messageId, reporterId..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {!loading && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLbl}>Đang hiển thị</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, styles.statHigh]}>{stats.high}</Text>
            <Text style={styles.statLbl}>Mức cao</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, styles.statCritical]}>{stats.critical}</Text>
            <Text style={styles.statLbl}>Nguy hiểm</Text>
          </View>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {[
          ['', 'Tất cả'],
          ['CRITICAL', 'Nguy hiểm'],
          ['HIGH', 'Cao'],
          ['MEDIUM', 'Trung bình'],
          ['LOW', 'Thấp'],
        ].map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.filterPill, severityFilter === value && styles.filterPillActive]}
            onPress={() => setSeverityFilter(value as Severity | '')}
          >
            <Text style={[styles.filterText, severityFilter === value && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.noticeBanner}>
        <Text style={styles.noticeText}>Nhấn card để tải chi tiết message. Nút M đổi nhanh mức độ xử lý.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Đang tải report...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadReports(0, true);
              }}
              colors={['#16a34a']}
            />
          }
          onEndReached={() => {
            if (!loadingMore && hasMore && !severityFilter) loadReports(page + 1);
          }}
          onEndReachedThreshold={0.35}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#16a34a" style={styles.footerLoader} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>Không có report phù hợp</Text>
              <Text style={styles.emptyText}>Thử xoá bộ lọc hoặc thay đổi từ khoá tìm kiếm.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ReportDetailModal
        visible={detailVisible}
        report={selectedReport}
        severity={selectedReport ? (severityMap[selectedReport.id] ?? severityByContent(selectedReport.content)) : 'LOW'}
        message={selectedMessage}
        messageLoading={messageLoading}
        onClose={() => setDetailVisible(false)}
        onSetSeverity={severity => selectedReport && setReportSeverity(selectedReport.id, severity)}
        onAction={handleAction}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#16a34a' },
  header: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { fontSize: 18, fontWeight: '900' },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#dcfce7', fontSize: 12, marginTop: 1 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: { fontSize: 16, color: '#16a34a', fontWeight: '800', marginRight: 10 },
  searchInput: { flex: 1, color: '#111827', fontSize: 14, padding: 0 },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 24, color: '#111827', fontWeight: '900' },
  statHigh: { color: '#c2410c' },
  statCritical: { color: '#dc2626' },
  statLbl: { marginTop: 2, fontSize: 11, color: '#6b7280', fontWeight: '600' },
  statDivider: { width: 1, height: 34, backgroundColor: '#e5e7eb' },

  filterRow: { backgroundColor: '#f3f4f6' },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterPillActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterText: { color: '#4b5563', fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: '#ffffff' },

  noticeBanner: {
    backgroundColor: '#f0fdf4',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  noticeText: { color: '#166534', fontSize: 12, fontWeight: '600' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  loadingText: { marginTop: 10, color: '#6b7280', fontSize: 13, fontWeight: '600' },
  footerLoader: { marginVertical: 18 },
  list: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  reportMark: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  reportMarkText: { fontSize: 20, fontWeight: '900' },
  cardBody: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, color: '#111827', fontSize: 14, fontWeight: '800' },
  cardContent: { color: '#374151', fontSize: 13, lineHeight: 18, marginTop: 5 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  cardMeta: { flex: 1, color: '#6b7280', fontSize: 11, fontWeight: '600' },
  cardDate: { color: '#9ca3af', fontSize: 11, fontWeight: '600' },
  quickSeverityBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  quickSeverityText: { fontSize: 14, fontWeight: '900' },

  severityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  severityText: { fontSize: 10, fontWeight: '900' },

  emptyBox: { alignItems: 'center', paddingTop: 64 },
  emptyIcon: { color: '#16a34a', fontSize: 40, fontWeight: '900', marginBottom: 10 },
  emptyTitle: { color: '#374151', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#9ca3af', fontSize: 13, marginTop: 6, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.46)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
    maxHeight: '92%',
  },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginBottom: 14 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  modalIcon: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  modalIconText: { color: '#dc2626', fontSize: 24, fontWeight: '900' },
  modalTitleWrap: { flex: 1 },
  modalTitle: { color: '#111827', fontSize: 18, fontWeight: '900' },
  modalSubtitle: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  modalContent: { maxHeight: '80%' },

  reasonBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 12,
  },
  reasonLabel: { color: '#6b7280', fontSize: 12, fontWeight: '800', marginBottom: 7 },
  reasonText: { color: '#111827', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  messagePreview: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
    padding: 12,
    marginBottom: 12,
  },
  messageLoader: { marginVertical: 12 },
  messageText: { color: '#1f2937', fontSize: 14, lineHeight: 20 },
  messageRemovedText: { color: '#9ca3af', fontStyle: 'italic' },
  messageMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10 },
  messageMeta: { color: '#64748b', fontSize: 11, fontWeight: '700' },

  infoCard: { backgroundColor: '#f9fafb', borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  infoLabel: { flex: 1, color: '#6b7280', fontSize: 12, fontWeight: '700' },
  infoValue: { flex: 2, color: '#111827', fontSize: 12, fontWeight: '700', textAlign: 'right' },

  sectionLabel: { color: '#374151', fontSize: 13, fontWeight: '900', marginBottom: 9 },
  severityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  severityOption: { width: '48%', borderRadius: 8, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  severityOptionActive: { borderWidth: 2 },
  severityOptionText: { fontSize: 12, fontWeight: '900' },

  actionGroup: { gap: 9, marginBottom: 8 },
  actionBtn: { borderRadius: 8, borderWidth: 1, padding: 13 },
  actionBtnInfo: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  actionBtnWarn: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  actionBtnDanger: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  actionBtnNeutral: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  actionDisabled: { opacity: 0.55 },
  actionTitle: { color: '#111827', fontSize: 14, fontWeight: '900' },
  actionWarnText: { color: '#c2410c' },
  actionDangerText: { color: '#dc2626' },
  actionSub: { color: '#6b7280', fontSize: 11, marginTop: 3, lineHeight: 15 },
  closeBtn: { marginTop: 8, marginBottom: 4, backgroundColor: '#f3f4f6', borderRadius: 8, padding: 14, alignItems: 'center' },
  closeBtnText: { color: '#374151', fontSize: 15, fontWeight: '800' },
});

export default ReportCenterScreen;
