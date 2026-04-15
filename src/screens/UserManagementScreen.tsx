import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  SafeAreaView, ActivityIndicator, RefreshControl, TextInput,
  Alert, Modal, ScrollView, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/apiClient';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

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

  updateUserProfile: (id: string, data: Partial<UserProfile>) =>
    apiClient.user.put(`/user/${id}`, data),

  uploadAvatar: async (id: string, imageUri: string, token: string) => {
    console.log('========================================');
    console.log('🚀 [uploadAvatar] STARTING AVATAR UPLOAD');
    console.log('========================================');
    console.log('📋 UserID:', id);
    console.log('📋 ImageUri:', imageUri);
    console.log('📋 Token length:', token?.length);
    console.log('📋 Token starts with:', token?.substring(0, 20) + '...');
    
    try {
      const formData = new FormData();
      
      // For React Native, we need to append file differently
      const imageExtension = imageUri.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
      const mimeType = imageExtension === 'png' ? 'image/png' : 'image/jpeg';
      
      formData.append('avatar', {
        uri: imageUri,
        type: mimeType,
        name: `avatar_${id}.${imageExtension}`,
      } as any);
      
      const baseURL = apiClient.user.defaults.baseURL;
      const uploadUrl = `${baseURL}/user/${id}/avatar/upload`;
      
      console.log('📍 Upload URL:', uploadUrl);
      console.log('📍 MIME Type:', mimeType);
      console.log('📍 Sending request...');
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      
      console.log('📊 Response Status:', response.status);
      console.log('📊 Response Status Text:', response.statusText);
      
      const responseText = await response.text();
      console.log('📊 Response Text:', responseText);
      
      let responseData: any = {};
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
          console.log('📊 Response Data:', responseData);
        } catch (parseError) {
          console.warn('⚠️ Could not parse response as JSON');
          responseData = { raw: responseText };
        }
      }
      
      if (response.ok) {
        console.log('✅ UPLOAD SUCCESS');
        console.log('========================================');
        return responseData;
      } else {
        const errorMsg = responseData?.message || responseData?.error || `Upload failed with status ${response.status}`;
        console.error('❌ UPLOAD FAILED:', errorMsg);
        console.log('========================================');
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ FETCH ERROR:', error.message);
      console.error('❌ Error Details:', error);
      console.log('========================================');
      throw error;
    }
  },

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
// ─── Edit Profile Modal ───────────────────────────────────────────────────
const EditProfileModal = ({
  visible,
  userId,
  profile,
  onClose,
  onSave,
}: {
  visible: boolean;
  userId: string | null;
  profile: Partial<UserProfile> | null;
  onClose: () => void;
  onSave: (id: string, data: Partial<UserProfile>) => Promise<void>;
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState(''); // 'MALE', 'FEMALE', or empty
  const [showGenderMenu, setShowGenderMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [errors, setErrors] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    if (visible && profile) {
      console.log('📋 [EditModal] Pre-filling form with profile:', profile);
      setName(profile.name || '');
      setEmail(profile.email || '');
      setPhone(profile.phoneNumber || '');
      setDob(profile.dateOfBirth || '');
      setAvatarUri(profile.avatarUrl || null);
      
      // Map boolean to string: true=FEMALE, false=MALE
      if (profile.gender !== undefined && profile.gender !== null) {
        setGender(profile.gender === true ? 'FEMALE' : 'MALE');
      } else {
        setGender('');
      }
      
      setErrors({ name: '', email: '', phone: '' });
      setShowGenderMenu(false);
    }
  }, [visible, profile]);

  const validate = () => {
    const newErrors = { name: '', email: '', phone: '' };
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = 'Tên không được để trống';
      isValid = false;
    } else if (name.trim().length < 2) {
      newErrors.name = 'Tên phải có ít nhất 2 ký tự';
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = 'Email không được để trống';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    if (!phone.trim()) {
      newErrors.phone = 'Số điện thoại không được để trống';
      isValid = false;
    } else if (phone.trim().length < 8) {
      newErrors.phone = 'Số điện thoại phải có ít nhất 8 ký tự';
      isValid = false;
    } else if (!/^\d+$/.test(phone.trim())) {
      newErrors.phone = 'Số điện thoại chỉ chứa chữ số';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const pickImage = async () => {
    try {
      console.log('📸 [EditModal] Picking image...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        console.log('📸 [EditModal] Image selected:', imageUri);
        setAvatarUri(imageUri);
      }
    } catch (e) {
      console.error('❌ [EditModal] Image pick error:', e);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleSave = async () => {
    if (!validate() || !userId) {
      console.warn('❌ Validation failed or no userId');
      return;
    }
    
    setLoading(true);
    
    try {
      // Step 1: Update profile data
      console.log('\n=== STEP 1: UPDATE PROFILE ===');
      const updateData: Partial<UserProfile> = {
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phone.trim(),
      };
      
      if (dob && dob.trim()) {
        updateData.dateOfBirth = dob.trim();
      }
      
      if (gender) {
        updateData.gender = gender === 'FEMALE';
      }

      console.log('📝 Profile data to save:', JSON.stringify(updateData, null, 2));
      await onSave(userId, updateData);
      console.log('✅ Profile saved successfully!\n');

      // Step 2: Handle avatar upload if new image selected
      if (avatarUri && avatarUri !== profile?.avatarUrl) {
        console.log('=== STEP 2: UPLOAD AVATAR ===');
        console.log('📸 New avatar detected at:', avatarUri);
        console.log('📸 Will upload...');
        
        setUploading(true);
        
        try {
          const token = await AsyncStorage.getItem('accessToken');
          console.log('🔑 Token retrieved from storage');
          
          if (!token) {
            console.error('❌ No token available!');
            Alert.alert('Lỗi xác thực', 'Token không có sẵn. Vui lòng đăng nhập lại.');
            setUploading(false);
            return;
          }

          console.log('🚀 Calling uploadAvatar...');
          await UserAPI.uploadAvatar(userId, avatarUri, token);
          console.log('✅ Avatar uploaded successfully!\n');
          
          Alert.alert('Thành công', 'Cập nhật hồ sơ và ảnh đại diện thành công!');
          onClose();
        } catch (avatarError: any) {
          console.error('❌ Avatar upload failed:', avatarError.message);
          
          // Profile was updated, but avatar upload failed
          // Ask user if they want to close anyway
          Alert.alert(
            'Cảnh báo',
            `Hồ sơ đã cập nhật, nhưng ảnh thất bại: ${avatarError.message}\n\nBạn có muốn đóng không?`,
            [
              { text: 'Thử lại', onPress: () => setUploading(false) },
              { text: 'Đóng', onPress: () => onClose() },
            ]
          );
        } finally {
          setUploading(false);
        }
      } else {
        // No avatar to upload, just close
        console.log('✅ No avatar to upload. Closing modal.');
        Alert.alert('Thành công', 'Cập nhật hồ sơ thành công!');
        onClose();
      }
    } catch (profileError: any) {
      console.error('❌ Profile save failed:', profileError);
      console.error('Status:', profileError?.response?.status);
      console.error('Message:', profileError?.response?.data?.message);
      
      const errorMsg = profileError?.response?.data?.message || 
                       profileError?.message || 
                       'Không thể cập nhật hồ sơ';
      Alert.alert('Lỗi cập nhật hồ sơ', errorMsg);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.editModalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />
          
          {/* Header */}
          <Text style={styles.modalTitle}>📝 Chỉnh sửa hồ sơ</Text>
          <Text style={styles.modalSub}>Cập nhật thông tin người dùng</Text>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarPlaceholder}>📷</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.avatarBtn, uploading && { opacity: 0.6 }]}
              onPress={pickImage}
              disabled={uploading}
            >
              <Text style={styles.avatarBtnText}>
                {uploading ? '⏳ Đang tải...' : '📸 Chọn ảnh'}
              </Text>
            </TouchableOpacity>
            {avatarUri && avatarUri !== profile?.avatarUrl && (
              <Text style={styles.avatarHint}>Ảnh sẽ được tải lên khi lưu</Text>
            )}
          </View>

          {/* Form Content - Scrollable */}
          <ScrollView 
            style={styles.editFormScroll}
            scrollEnabled={true}
            nestedScrollEnabled={true}
          >
            {/* Name */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Tên đầy đủ *</Text>
              <TextInput
                style={[styles.editInput, errors.name && styles.editInputError]}
                placeholder="Nhập tên"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
              {errors.name && <Text style={styles.editErrorText}>{errors.name}</Text>}
            </View>

            {/* Email */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Email *</Text>
              <TextInput
                style={[styles.editInput, errors.email && styles.editInputError]}
                placeholder="example@email.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.editErrorText}>{errors.email}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Số điện thoại *</Text>
              <TextInput
                style={[styles.editInput, errors.phone && styles.editInputError]}
                placeholder="0xxxxxxxxx"
                placeholderTextColor="#9ca3af"
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
                keyboardType="phone-pad"
              />
              {errors.phone && <Text style={styles.editErrorText}>{errors.phone}</Text>}
            </View>

            {/* Date of Birth */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Ngày sinh</Text>
              <TextInput
                style={styles.editInput}
                placeholder="YYYY-MM-DD (vd: 2000-01-15)"
                placeholderTextColor="#9ca3af"
                value={dob}
                onChangeText={setDob}
                editable={!loading}
              />
            </View>

            {/* Gender */}
            <View style={styles.editField}>
              <Text style={styles.editLabel}>Giới tính</Text>
              <TouchableOpacity
                style={styles.editGenderBtn}
                onPress={() => setShowGenderMenu(!showGenderMenu)}
                disabled={loading}
              >
                <Text style={styles.editGenderBtnText}>
                  {gender === 'MALE' ? '👨 Nam' : gender === 'FEMALE' ? '👩 Nữ' : '- Chọn giới tính -'}
                </Text>
                <Text style={{ marginLeft: 'auto', fontSize: 14 }}>▼</Text>
              </TouchableOpacity>

              {showGenderMenu && (
                <View style={styles.editGenderMenu}>
                  {[
                    { value: 'MALE', label: '👨 Nam' },
                    { value: 'FEMALE', label: '👩 Nữ' },
                  ].map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.editGenderMenuItem, gender === opt.value && styles.editGenderMenuItemActive]}
                      onPress={() => {
                        setGender(opt.value);
                        setShowGenderMenu(false);
                      }}
                    >
                      <Text style={[styles.editGenderMenuText, gender === opt.value && styles.editGenderMenuTextActive]}>
                        {opt.label}
                      </Text>
                      {gender === opt.value && <Text style={{ marginLeft: 'auto' }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Extra space */}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Action Buttons - Fixed at Bottom */}
          <View style={styles.editModalActions}>
            <TouchableOpacity
              style={[styles.editActionBtn, { backgroundColor: '#f3f4f6' }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.editActionBtnText, { color: '#374151' }]}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editActionBtn, { backgroundColor: '#16a34a' }, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.editActionBtnText, { color: '#fff' }]}>✓ Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
// ─── Detail Modal ────────────
// ─────────────────────────────────────────────────

const UserDetailModal = ({
  visible, user, onClose, onToggleStatus, onDelete, onEditProfile, onViewMessages, onViewFriends, profileLoading = false,
}: {
  visible: boolean;
  user: UserItem | null;
  onClose: () => void;
  onToggleStatus: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onEditProfile: (id: string, profile: Partial<UserProfile>) => void;
  onViewMessages: (id: string) => void;
  onViewFriends: (id: string) => void;
  profileLoading?: boolean;
}) => {
  const [avatarError, setAvatarError] = useState(false);
  
  useEffect(() => {
    if (visible) {
      setAvatarError(false);
    }
  }, [visible]);
  
  if (!user) return null;
  const { account, profile } = user;
  const rows = [
    { label: 'ID tài khoản', value: account.id },
    { label: 'Username', value: account.username },
    { label: 'Email', value: profile?.email ?? '—' },
    { label: 'SĐT', value: profile?.phoneNumber ?? '—' },
    { label: 'Họ tên', value: profile?.name ?? '—' },
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
            {profile?.avatarUrl && !avatarError ? (
              <Image
                source={{ uri: profile.avatarUrl }}
                style={{ width: '100%', height: '100%' }}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <Text style={styles.modalAvatarText}>
                {(profile?.name ?? account.username)?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            )}
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

            {/* Core Actions */}
            <Text style={styles.actionGroupLabel}>Quản lý tài khoản</Text>
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
                style={[styles.actionBtn, styles.actionBtnInfo, profileLoading && { opacity: 0.5 }]}
                onPress={() => onEditProfile(account.id, profile || {})}
                disabled={profileLoading}
              >
                {profileLoading ? (
                  <ActivityIndicator color="#1d4ed8" size="small" />
                ) : (
                  <Text style={[styles.actionBtnText, styles.actionBtnTextInfo]}>📝  Chỉnh sửa hồ sơ</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* View Actions */}
            <Text style={styles.actionGroupLabel}>Xem chi tiết</Text>
            <View style={styles.actionGroup}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSecondary]}
                onPress={() => {
                  onClose();
                  setTimeout(() => onViewMessages(account.id), 300);
                }}
              >
                <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>💬  Tin nhắn của user</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSecondary]}
                onPress={() => {
                  onClose();
                  setTimeout(() => onViewFriends(account.id), 300);
                }}
              >
                <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>🌐  Bạn bè & Block</Text>
              </TouchableOpacity>
            </View>

            {/* Danger Zone */}
            <Text style={styles.actionGroupLabel}>Vùng nguy hiểm</Text>
            <View style={styles.actionGroup}>
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
  const [roleFilter, setRoleFilter] = useState<string>(''); // '', 'USER', 'MOD', 'ADMIN'
  const [sortBy, setSortBy] = useState<string>('newest'); // newest, oldest, a-z
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 20;

  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Edit profile modal state
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<Partial<UserProfile> | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      console.log('🔍 [Search] Debounced search:', search);
      setSearchDebounce(search);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reload on filter change
  useEffect(() => {
    console.log('🔄 [Filter change] search:', searchDebounce, 'status:', statusFilter, 'role:', roleFilter, 'sort:', sortBy);
    loadAccounts(0, true);
  }, [searchDebounce, statusFilter, roleFilter, sortBy]);

  const loadAccounts = async (pageNum = 0, reset = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const params: Record<string, any> = {
        page: pageNum,
        size: PAGE_SIZE * 2,
      };

      console.log('🔍 [UserManagement] Loading accounts with params:', params);

      const res = await UserAPI.getAccounts(params);
      console.log('📦 [UserManagement] Raw response:', res);
      
      let data: Account[] = Array.isArray(res.data)
        ? res.data
        : (res.data?.content ?? []);

      // Client-side filtering
      data = data.filter(account => {
        // Search filter
        if (searchDebounce) {
          const search = searchDebounce.toLowerCase();
          const matches = 
            account.username?.toLowerCase().includes(search) ||
            account.id?.toLowerCase().includes(search);
          if (!matches) return false;
        }

        // Status filter (0=all, 1=active, 2=locked)
        if (statusFilter !== 0) {
          const isActive = account.status === true;
          if (statusFilter === 1 && !isActive) return false;
          if (statusFilter === 2 && isActive) return false;
        }

        // Role filter
        if (roleFilter && account.role !== roleFilter) return false;

        return true;
      });

      // Client-side sorting
      if (sortBy === 'a-z') {
        data.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
      } else if (sortBy === 'oldest') {
        data.sort((a, b) => new Date(a.createdDate || 0).getTime() - new Date(b.createdDate || 0).getTime());
      } else {
        // newest (default)
        data.sort((a, b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime());
      }

      console.log('📊 [UserManagement] Filtered data count:', data.length);

      if (reset || pageNum === 0) {
        setAccounts(data);
      } else {
        setAccounts(prev => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE * 2);
      setPage(pageNum);
    } catch (e: any) {
      console.error('❌ Load accounts error:', e);
      console.error('❌ Error status:', e?.response?.status);
      console.error('❌ Error message:', e?.response?.data?.message);
      console.error('❌ Error body:', e?.response?.data);
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
    // Navigate to UserDetailScreen to view all user's social data
    navigation?.navigate?.('user-detail', { userId: account.id });
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

  const handleEditProfile = (id: string, currentProfile: Partial<UserProfile>) => {
    setEditingUserId(id);
    setEditingProfile(currentProfile);
    setEditProfileVisible(true);
  };

  const handleSaveProfile = async (id: string, data: Partial<UserProfile>) => {
    try {
      console.log('📤 [SaveProfile] Sending data:', JSON.stringify(data, null, 2));
      await UserAPI.updateUserProfile(id, data);
      console.log('✅ [SaveProfile] Success!');
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ.');

      // Update local state
      if (selectedUser?.profile) {
        const updatedProfile: UserProfile = {
          ...selectedUser.profile,
          ...data,
        };
        setSelectedUser({
          ...selectedUser,
          profile: updatedProfile,
        });
      }
    } catch (e: any) {
      console.error('❌ [SaveProfile] Error:', e);
      console.error('❌ [SaveProfile] Status:', e?.response?.status);
      console.error('❌ [SaveProfile] Message:', e?.response?.data?.message);
      console.error('❌ [SaveProfile] Data:', e?.response?.data);
      const msg = e?.response?.data?.message || e?.message || 'Không thể cập nhật hồ sơ.';
      Alert.alert('Lỗi', msg);
      throw e;
    }
  };

  const handleViewMessages = (userId: string) => {
    navigation?.navigate?.('MessageManagementScreen', { filter: { senderId: userId } });
  };

  const handleViewFriends = (userId: string) => {
    navigation?.navigate?.('SocialManagement', { filter: { userId } });
  };

  // ── Render item ────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: Account }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
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
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.cardActionBtn, item.status ? styles.lockBtnActive : styles.lockBtnLocked]}
          onPress={() => handleToggleStatus(item.id, item.status)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 16 }}>{item.status ? '🔓' : '🔒'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={() => openDetail(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 16 }}>👁️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Filter pills ───────────────────────────────────────────────────────────
  const filters = [
    { label: 'Tất cả', value: 0 },
    { label: '✅ Hoạt động', value: 1 },
    { label: '🔒 Đã khoá', value: 2 },
  ];
  const tabBarHeight = useBottomTabBarHeight();
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
          style={{ maxHeight: 40 }} 
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
          }}
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

      {/* Role & Sort Controls */}
      <View style={styles.controlBar}>
        <TouchableOpacity 
          style={[styles.controlBtn, roleFilter && styles.controlBtnActive]}
          onPress={() => setShowRoleMenu(!showRoleMenu)}
        >
          <Text style={styles.controlBtnText}>👤 {roleFilter || 'Role'}</Text>
          <Text style={{ fontSize: 12, marginLeft: 4 }}>▼</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlBtn, styles.controlBtnSort]}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <Text style={styles.controlBtnText}>📊 {
            sortBy === 'newest' ? 'Mới nhất' :
            sortBy === 'oldest' ? 'Cũ nhất' : 'A→Z'
          }</Text>
          <Text style={{ fontSize: 12, marginLeft: 4 }}>▼</Text>
        </TouchableOpacity>

        {(roleFilter || statusFilter !== 0) && (
          <TouchableOpacity 
            style={styles.controlBtnClear}
            onPress={() => {
              setRoleFilter('');
              setStatusFilter(0);
              setSortBy('newest');
            }}
          >
            <Text style={{ fontSize: 12 }}>✕ Xoá lọc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Role Menu */}
      {showRoleMenu && (
        <View style={styles.dropdownMenu}>
          {['', 'USER', 'MOD', 'ADMIN'].map(role => (
            <TouchableOpacity
              key={role}
              style={[styles.menuItem, roleFilter === role && styles.menuItemActive]}
              onPress={() => {
                setRoleFilter(role);
                setShowRoleMenu(false);
              }}
            >
              <Text style={[styles.menuText, roleFilter === role && styles.menuTextActive]}>
                {role ? role : 'Tất cả role'}
              </Text>
              {roleFilter === role && <Text style={{ marginLeft: 'auto' }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sort Menu */}
      {showSortMenu && (
        <View style={styles.dropdownMenu}>
          {[
            { value: 'newest', label: 'Mới nhất' },
            { value: 'oldest', label: 'Cũ nhất' },
            { value: 'a-z', label: 'A → Z' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.menuItem, sortBy === opt.value && styles.menuItemActive]}
              onPress={() => {
                setSortBy(opt.value);
                setShowSortMenu(false);
              }}
            >
              <Text style={[styles.menuText, sortBy === opt.value && styles.menuTextActive]}>
                {opt.label}
              </Text>
              {sortBy === opt.value && <Text style={{ marginLeft: 'auto' }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

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
            contentContainerStyle={[
              styles.list,
              {
                flexGrow: 1,
                paddingBottom: tabBarHeight + 24,
              }
            ]}          refreshControl={
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
        onEditProfile={handleEditProfile}
        onViewMessages={handleViewMessages}
        onViewFriends={handleViewFriends}
        profileLoading={profileLoading}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editProfileVisible}
        userId={editingUserId}
        profile={editingProfile}
        onClose={() => {
          setEditProfileVisible(false);
          setEditingUserId(null);
          setEditingProfile(null);
        }}
        onSave={handleSaveProfile}
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
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  filterPillActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  filterText: { fontSize: 13, color: '#4b5563', fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  controlBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  controlBtn: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    flex: 1,
  },
  controlBtnActive: {
    borderColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  controlBtnSort: {
    flex: 1,
  },
  controlBtnClear: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  controlBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },

  dropdownMenu: {
    position: 'absolute',
    top: 360,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemActive: {
    backgroundColor: '#f0fdf4',
  },
  menuText: {
    fontSize: 13,
    color: '#374151',
  },
  menuTextActive: {
    color: '#16a34a',
    fontWeight: '700',
  },

  loadingBox: { flex: 1, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9ca3af', marginTop: 8 },

list: {
  backgroundColor: '#f3f4f6',

  paddingHorizontal: 16,
  paddingTop: 8,
  paddingBottom: 24,

  // 👇 THÊM
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  marginTop: 8,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 3,
},
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 3,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  cardAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardAvatarLocked: { backgroundColor: '#fee2e2' },
  cardAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#16a34a' },
  cardBody: { flex: 1, justifyContent: 'center' },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardUsername: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1, marginRight: 8 },
  cardId: { fontSize: 12, color: '#64748b', marginRight: 8 },
  cardActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  cardActionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  lockBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  lockBtnActive: { backgroundColor: '#f0fdf4' },
  lockBtnLocked: { backgroundColor: '#fee2e2' },

  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 4 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeLocked: { backgroundColor: '#fee2e2' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeDotActive: { backgroundColor: '#16a34a' },
  badgeDotLocked: { backgroundColor: '#ef4444' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  badgeTextActive: { color: '#15803d' },
  badgeTextLocked: { color: '#dc2626' },

  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },

  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    borderWidth: 3, borderColor: '#16a34a', overflow: 'hidden',
  },
  modalAvatarText: { fontSize: 32, fontWeight: 'bold', color: '#16a34a' },
  modalName: { fontSize: 20, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 8 },
  modalScroll: { maxHeight: 480 },

  infoCard: { backgroundColor: '#f9fafb', borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  infoLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500', flex: 1 },
  infoValue: { fontSize: 13, color: '#111827', fontWeight: '600', flex: 2, textAlign: 'right' },

  actionGroupLabel: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8, marginHorizontal: 14 },
  actionGroup: { gap: 10, marginBottom: 8 },
  actionBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnWarn: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  actionBtnSuccess: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  actionBtnInfo: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  actionBtnSecondary: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  actionBtnDanger: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  actionBtnTextWarn: { color: '#c2410c' },
  actionBtnTextSuccess: { color: '#15803d' },
  actionBtnTextInfo: { color: '#1d4ed8' },
  actionBtnTextSecondary: { color: '#374151' },
  actionBtnTextDanger: { color: '#dc2626' },

  modalClose: {
    marginTop: 8, marginBottom: 4, backgroundColor: '#f3f4f6',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#374151' },

  // Edit Profile Modal
  editModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    fontSize: 32,
  },
  avatarBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  avatarBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarHint: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  editFormScroll: {
    flex: 1,
    minHeight: 150,
    marginVertical: 12,
  },
  editField: { marginBottom: 16 },
  editLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  editInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  editInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  editErrorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 6,
    fontWeight: '500',
  },
  editGenderBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editGenderBtnText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  editGenderMenu: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    zIndex: 10,
  },
  editGenderMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  editGenderMenuItemActive: {
    backgroundColor: '#f0fdf4',
  },
  editGenderMenuText: {
    fontSize: 13,
    color: '#374151',
  },
  editGenderMenuTextActive: {
    color: '#16a34a',
    fontWeight: '700',
  },
  editModalActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    paddingBottom: 8,
  },
  editActionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4, textAlign: 'center' },
  modalSub: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 16 },
  closeBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});

export default UserManagementScreen;