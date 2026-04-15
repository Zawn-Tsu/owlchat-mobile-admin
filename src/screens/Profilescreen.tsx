import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, Image, Modal, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { UserService } from '../services/userService';
import { ChatService } from '../services/chatService';
import { SocialService } from '../services/socialService';
import { UserProfile } from '../types/api';

// Pagination size constant - centralized for easy backend updates
const PAGINATION_SIZE = 100;

interface ProfileStats {
  totalUsers: number;
  totalChats: number;
  totalBlocks: number;
  totalFriendRequests: number;
}

const ProfileScreen: React.FC = () => {
  const { logout, userId } = useAuth();
  const [stats, setStats] = useState<ProfileStats>({
    totalUsers: 0, totalChats: 0, totalBlocks: 0, totalFriendRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(true);
  const [adminProfile, setAdminProfile] = useState<UserProfile | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const [usersRes, chatsRes, blocksRes, friendReqRes] = await Promise.all([
          UserService.getUsers({ size: PAGINATION_SIZE }),
          ChatService.getChats({ size: PAGINATION_SIZE }),
          SocialService.getBlocks({ size: PAGINATION_SIZE }),
          SocialService.getFriendRequests({ size: PAGINATION_SIZE, ascSort: false }),
        ]);
        if (isMounted) {
          setStats({
            totalUsers: Array.isArray(usersRes) ? usersRes.length : (usersRes?.totalElements ?? 0),
            totalChats: Array.isArray(chatsRes) ? chatsRes.length : (chatsRes?.totalElements ?? 0),
            totalBlocks: Array.isArray(blocksRes) ? blocksRes.length : (blocksRes?.totalElements ?? 0),
            totalFriendRequests: Array.isArray(friendReqRes) ? friendReqRes.length : (friendReqRes?.totalElements ?? 0),
          });
        }
      } catch (e) {
        console.error('Profile stats error:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    const loadAvatarFromServer = async () => {
      if (!userId) {
        if (isMounted) setLoadingAvatar(false);
        return;
      }
      try {
        if (isMounted) setLoadingAvatar(true);
        // Optimization: If your API supports it, request avatar URL instead of blob
        // For now, we'll keep blob approach but use it efficiently
        const blob = await UserService.getAvatar(userId);
        if (isMounted) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (isMounted) {
              setSelectedImage(reader.result as string);
            }
          };
          reader.readAsDataURL(blob);
        }
      } catch (error: any) {
        if (isMounted) {
          if (error.response?.status === 400) {
            console.log('User chưa có avatar, dùng emoji default');
            setSelectedImage(null);
          } else {
            console.error('Load avatar error:', error);
          }
      }
      } finally {
        if (isMounted) setLoadingAvatar(false);
      }
    };

    const loadProfile = async () => {
      try {
        const profile = await UserService.getCurrentUser();
        if (isMounted) {
          setAdminProfile(profile);
        }
      } catch (error) {
        console.error('Fetch admin profile error:', error);
      }
    };

    fetchStats();
    loadProfile();
    loadAvatarFromServer();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const handleOpenEdit = () => {
    setEditFormData({
      name: adminProfile?.name || '',
      email: adminProfile?.email || '',
      phoneNumber: adminProfile?.phoneNumber || '',
      dateOfBirth: adminProfile?.dateOfBirth || '',
    });
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!userId) return;

    // Input validation - trim all inputs
    const email = editFormData.email?.trim() || '';
    const phoneNumber = editFormData.phoneNumber?.trim() || '';
    const name = editFormData.name?.trim() || '';

    if (!name) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return;
    }

    // Email validation: if provided, must be valid. If empty, that's ok.
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      Alert.alert('Lỗi', 'Địa chỉ email không hợp lệ');
      return;
    }

    // Phone validation: if provided, must be valid. If empty, that's ok.
    if (phoneNumber && !phoneNumber.match(/^[\d\s\-\+\(\)]{10,}$/)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (tối thiểu 10 ký tự)');
      return;
    }

    try {
      setIsSaving(true);
      
      // Build payload - only include non-empty fields like CreateUserScreen
      const payload: any = {
        name,
        gender: editFormData.gender ?? true,
      };

      // Only include email if it's not empty
      if (email) {
        payload.email = email;
      }

      // Only include phoneNumber if it's not empty
      if (phoneNumber) {
        payload.phoneNumber = phoneNumber;
      }

      // Add optional dateOfBirth only if provided
      if (editFormData.dateOfBirth && editFormData.dateOfBirth.trim() !== '') {
        const dobValue = editFormData.dateOfBirth.trim();
        // Only send if it looks like a valid date format (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dobValue)) {
          payload.dateOfBirth = dobValue;
        }
      }

      console.log('📤 Updating profile with payload:', JSON.stringify(payload, null, 2));
      const updated = await UserService.updateUser(userId, payload);
      setAdminProfile(updated);
      setIsEditModalVisible(false);
      Alert.alert('Thành công', 'Cập nhật thông tin thành công!');
    } catch (e: any) {
      console.error('Save profile error:', e);
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể lưu hồ sơ');
    } finally {
      setIsSaving(false);
    }
  };

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

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Lỗi', 'Bạn cần cấp quyền truy cập thư viện ảnh');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      handleUploadImage(result.assets[0].uri);
    }
  };

  const handleUploadImage = async (imageUri: string) => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      
      const filename = imageUri.split('/').pop() || 'avatar.jpg';
      // Robust file extension extraction - handles edge cases
      const extensionIndex = filename.lastIndexOf('.');
      const extension = extensionIndex > 0 ? filename.substring(extensionIndex + 1).toLowerCase() : 'jpg';
      const type = extension ? `image/${extension}` : 'image/jpeg';

      // @ts-ignore - FormData.append for React Native
      formData.append('file', {
        uri: imageUri,
        type,
        name: filename,
      });

      if (userId) {
        await UserService.uploadAvatar(userId, formData);
        Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công');
        
        // OPTIMIZATION: Ideally, server should return avatar URL in response
        // This would avoid expensive blob -> base64 conversion via FileReader
        // Current approach: keep the selected image, avoid extra network call
        // Uncomment below if server returns new URL:
        // setSelectedImage(newAvatarUrl);
        
        // If you must reload, use blob but add isMounted check
        try {
          const blob = await UserService.getAvatar(userId);
          const reader = new FileReader();
          reader.onloadend = () => {
            setSelectedImage(reader.result as string);
          };
          reader.readAsDataURL(blob);
        } catch (reloadError: any) {
          if (reloadError.response?.status === 400) {
            console.log('Avatar uploaded successfully, using local preview');
          } else {
            console.error('Reload avatar error:', reloadError);
          }
        }
      }
    } catch (error) {
      console.error('Upload avatar error:', error);
      Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
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
          <TouchableOpacity 
            onPress={pickImage}
            disabled={isUploading}
            style={styles.avatarContainer}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>🦉</Text>
              </View>
            )}
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            <View style={styles.uploadIconBadge}>
              <Text style={styles.uploadIconText}>📷</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>🛡️ Super Admin</Text>
          </View>
          <Text style={styles.adminName}>{adminProfile?.name || 'Admin'}</Text>
          <Text style={styles.adminEmail}>{adminProfile?.email || 'admin@owlchat.com'}</Text>
          <View style={styles.onlinePill}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Đang hoạt động</Text>
          </View>
        </View>

        {/* Thông tin hồ sơ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleNoMargin}>Thông tin cá nhân</Text>
          <TouchableOpacity onPress={handleOpenEdit}>
            <Text style={styles.editBtnText}>✏️ Chỉnh sửa</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.summaryCard}>
          {[
            { icon: '🏷️', title: 'Họ và tên', sub: adminProfile?.name || 'Chưa cập nhật' },
            { icon: '📱', title: 'Số điện thoại', sub: adminProfile?.phoneNumber || 'Chưa cập nhật' },
            { icon: '🎂', title: 'Ngày sinh', sub: adminProfile?.dateOfBirth || 'Chưa cập nhật' },
            { icon: '📧', title: 'Email', sub: adminProfile?.email || 'Chưa cập nhật' },
          ].map((row, i) => (
            <View key={i} style={[styles.summaryRow, i > 0 && styles.summaryRowBorder]}>
              <Text style={styles.summaryIcon}>{row.icon}</Text>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryTitle}>{row.title}</Text>
                <Text style={styles.summarySubtitle}>{row.sub}</Text>
              </View>
            </View>
          ))}
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

      {/* Modal chỉnh sửa */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent onRequestClose={() => setIsEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Chỉnh sửa hồ sơ</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput style={styles.input} value={editFormData.name} onChangeText={t => setEditFormData({...editFormData, name: t})} />
            </View>
            
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={editFormData.email} onChangeText={t => setEditFormData({...editFormData, email: t})} keyboardType="email-address" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Số điện thoại</Text>
              <TextInput style={styles.input} value={editFormData.phoneNumber} onChangeText={t => setEditFormData({...editFormData, phoneNumber: t})} keyboardType="phone-pad" />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ngày sinh (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={editFormData.dateOfBirth} onChangeText={t => setEditFormData({...editFormData, dateOfBirth: t})} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#f3f4f6' }]} onPress={() => setIsEditModalVisible(false)}>
                <Text style={{ color: '#374151', fontWeight: '600' }}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#16a34a' }]} onPress={handleSaveProfile} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600' }}>Lưu thay đổi</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#16a34a',
  },
  avatarImage: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: '#16a34a',
  },
  uploadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 44, backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  uploadIconBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#16a34a', borderRadius: 20, width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  uploadIconText: {
    fontSize: 16,
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
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 10, marginTop: 4,
  },
  sectionTitleNoMargin: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  editBtnText: { color: '#16a34a', fontSize: 14, fontWeight: '600' },

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
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 20, textAlign: 'center' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  modalBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 10 },
});

export default ProfileScreen;