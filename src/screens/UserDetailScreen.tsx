import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, Alert, Image, Modal, TextInput, RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { UserService } from '../services/userService';
import { SocialService } from '../services/socialService';
import { ChatService } from '../services/chatService';
import { UserProfile, Friendship, Block, Chat, FriendRequest } from '../types/api';

const UserDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const userId = (route.params as any)?.userId;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [friendDetails, setFriendDetails] = useState<Map<string, UserProfile>>(new Map());
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<UserProfile>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => { loadUserData(); }, [userId]);

  const loadAvatar = async () => {
    if (!userId) return;
    try {
      console.log('📸 Loading avatar for userId:', userId);
      const blob = await UserService.getAvatar(userId);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        console.log('✅ Avatar loaded successfully');
      };
      reader.readAsDataURL(blob);
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('ℹ️ User không có avatar');
        setAvatar(null);
      } else {
        console.error('❌ Load avatar error:', error);
      }
    }
  };

  const loadFriendDetails = async (friendIds: string[]): Promise<Set<string>> => {
    console.log('👥 Loading friend details for:', friendIds);
    const details = new Map<string, UserProfile>();
    const validFriendIds = new Set<string>();
    const deletedFriendIds = new Set<string>();
    
    for (const id of friendIds) {
      try {
        const profile = await UserService.getUser(id);
        // Check if user is deleted or inactive
        if (profile.status === 'DELETED' || (profile as any).deletedAt) {
          console.warn(`⚠️ Friend ${id} is deleted`);
          deletedFriendIds.add(id);
          continue;
        }
        details.set(id, profile);
        validFriendIds.add(id);
        console.log(`✅ Loaded ${id}: ${profile.name}`);
      } catch (e: any) {
        if (e.response?.status === 404) {
          console.error(`❌ Friend ${id} not found (404) - user was deleted`);
          deletedFriendIds.add(id);
        } else {
          console.error(`❌ Failed to load friend ${id}:`, e);
        }
      }
    }
    
    setFriendDetails(details);
    console.log('📊 Friend details loaded:', details.size, '| Deleted:', deletedFriendIds.size);
    return validFriendIds; // Return set of valid IDs for filtering
  };

  const validateBlockedUser = async (blockedId: string): Promise<boolean> => {
    try {
      const profile = await UserService.getUser(blockedId);
      if (profile.status === 'DELETED' || (profile as any).deletedAt) {
        console.warn(`⚠️ Blocked user ${blockedId} is deleted`);
        return false;
      }
      return true;
    } catch (e: any) {
      if (e.response?.status === 404) {
        console.error(`❌ Blocked user ${blockedId} not found (404)`);
        return false;
      }
      return true; // Assume valid if other errors
    }
  };

  const validateChatRoom = async (chatId: string): Promise<boolean> => {
    try {
      // Try to check if chat exists by attempting to access it
      // If 404 or user deleted, remove it
      // For now, assume chats are valid if we got them from API
      return true;
    } catch (e: any) {
      return false;
    }
  };

  const validateFriendRequest = async (senderId: string, receiverId: string): Promise<boolean> => {
    try {
      const senderProfile = await UserService.getUser(senderId).catch(() => null);
      const receiverProfile = await UserService.getUser(receiverId).catch(() => null);
      
      // If either user is deleted, remove the request
      if (!senderProfile || senderProfile.status === 'DELETED' || (senderProfile as any).deletedAt) {
        console.warn(`⚠️ Friend request sender ${senderId} is deleted`);
        return false;
      }
      if (!receiverProfile || receiverProfile.status === 'DELETED' || (receiverProfile as any).deletedAt) {
        console.warn(`⚠️ Friend request receiver ${receiverId} is deleted`);
        return false;
      }
      return true;
    } catch (e: any) {
      console.error(`❌ Failed to validate friend request:`, e);
      return false;
    }
  };

  const loadUserData = async () => {
    if (!userId) return;
    try {
      const [userRes, friendsRes, blocksRes, chatsRes, reqRes] = await Promise.all([
        UserService.getUser(userId),
        SocialService.getFriendships().catch(() => []),
        SocialService.getBlocks({ size: 100 }).catch(() => []),
        ChatService.getChats({ size: 100 }).catch(() => []),
        SocialService.getFriendRequests({ size: 100 }).catch(() => []),
      ]);

      setUser(userRes);

      // API trả về array thẳng hoặc paginated
      const friendsData = Array.isArray(friendsRes) ? friendsRes : (friendsRes as any)?.content ?? [];
      const blocksData = Array.isArray(blocksRes) ? blocksRes : (blocksRes as any)?.content ?? [];
      const chatsData = Array.isArray(chatsRes) ? chatsRes : (chatsRes as any)?.content ?? [];
      const reqData = Array.isArray(reqRes) ? reqRes : (reqRes as any)?.content ?? [];

      // Lọc chỉ lấy data liên quan đến userId này
      const filteredFriends = friendsData.filter((f: Friendship) => {
        const isRelated = f.firstUserId === userId || f.secondUserId === userId;
        return isRelated;
      });
      
      const filteredBlocks = blocksData.filter((b: Block) => b.blockerId === userId);
      const filteredChats = chatsData.filter((c: Chat) => c.initiatorId === userId);
      const filteredRequests = reqData.filter((r: FriendRequest) => r.senderId === userId || r.receiverId === userId);
      
      console.log('📊 Data before validation:', { 
        friends: filteredFriends.length, 
        blocks: filteredBlocks.length,
        chats: filteredChats.length,
        requests: filteredRequests.length 
      });

      // Load avatar
      await loadAvatar();

      // ===== VALIDATE & FILTER FRIENDS =====
      let validatedFriends = filteredFriends;
      const friendsToLoad = filteredFriends.map((f: Friendship) => 
        f.firstUserId === userId ? f.secondUserId : f.firstUserId
      );
      
      if (friendsToLoad.length > 0) {
        console.log('🔍 Validating friends...');
        const validFriendIds = await loadFriendDetails(friendsToLoad);
        // Filter friends to only include valid ones
        validatedFriends = filteredFriends.filter(f => {
          const friendId = f.firstUserId === userId ? f.secondUserId : f.firstUserId;
          const isValid = validFriendIds.has(friendId);
          if (!isValid) console.log(`❌ Removing invalid friend: ${friendId}`);
          return isValid;
        });
        console.log(`✅ Valid friends: ${validatedFriends.length} (removed ${filteredFriends.length - validatedFriends.length})`);
      }
      
      setFriends(validatedFriends);

      // ===== VALIDATE & FILTER BLOCKS =====
      console.log('🔍 Validating blocked users...');
      const validBlocks: Block[] = [];
      for (const block of filteredBlocks) {
        const isValid = await validateBlockedUser(block.blockedId);
        if (isValid) {
          validBlocks.push(block);
        } else {
          console.log(`❌ Removing deleted blocked user: ${block.blockedId}`);
        }
      }
      setBlocks(validBlocks);

      // ===== VALIDATE & FILTER REQUESTS =====
      console.log('🔍 Validating friend requests...');
      const validRequests: FriendRequest[] = [];
      for (const req of filteredRequests) {
        const isValid = await validateFriendRequest(req.senderId, req.receiverId);
        if (isValid) {
          validRequests.push(req);
        } else {
          console.log(`❌ Removing friend request from ${req.senderId} to ${req.receiverId}`);
        }
      }
      setRequests(validRequests);

      // Chats are usually safe (group chats), but could add validation if needed
      setChats(filteredChats);
      
      console.log('📊 Data after validation:', { 
        friends: validatedFriends.length, 
        blocks: validBlocks.length,
        chats: filteredChats.length,
        requests: validRequests.length 
      });
      
    } catch (error) {
      console.error('❌ Load user data error:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin user');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadUserData(); };

  const pickAvatarImage = async () => {
    try {
      console.log('📸 [Avatar] Picking image...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        console.log('📸 [Avatar] Image selected:', imageUri);
        setNewAvatarUri(imageUri);
      }
    } catch (e) {
      console.error('❌ [Avatar] Image pick error:', e);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleUploadAvatar = async () => {
    if (!newAvatarUri || !userId) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh');
      return;
    }

    try {
      setIsUploadingAvatar(true);
      console.log('🚀 [Avatar] Starting avatar upload...');
      
      const formData = new FormData();
      
      const filename = newAvatarUri.split('/').pop() || 'avatar.jpg';
      // Extract file extension
      const extensionIndex = filename.lastIndexOf('.');
      const extension = extensionIndex > 0 ? filename.substring(extensionIndex + 1).toLowerCase() : 'jpg';
      const type = extension ? `image/${extension}` : 'image/jpeg';

      // IMPORTANT: Use 'file' as the field name, not 'avatar'
      formData.append('file', {
        uri: newAvatarUri,
        type,
        name: filename,
      } as any);

      console.log('📍 [Avatar] Uploading with filename:', filename, 'type:', type);
      
      await UserService.uploadAvatar(userId, formData);
      
      console.log('✅ [Avatar] Avatar uploaded successfully!');
      Alert.alert('✅ Thành công', 'Cập nhật ảnh đại diện thành công!');
      setIsAvatarModalVisible(false);
      setNewAvatarUri(null);
      
      // Reload avatar
      await loadAvatar();
    } catch (error: any) {
      console.error('❌ [Avatar] Upload error:', error);
      const msg = error?.response?.data?.message || error?.message || 'Không thể tải ảnh';
      Alert.alert('❌ Lỗi', msg);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleOpenEdit = () => {
    if (!user) return;
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      phoneNumber: user.phoneNumber || '',
      dateOfBirth: user.dateOfBirth || '',
      gender: user.gender,
    });
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!userId || !user) return;
    const name = editFormData.name?.trim() || '';
    const email = editFormData.email?.trim() || '';
    const phoneNumber = editFormData.phoneNumber?.trim() || '';
    const dateOfBirth = editFormData.dateOfBirth?.trim() || '';

    if (!name) { Alert.alert('Lỗi', 'Vui lòng nhập họ và tên'); return; }
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { Alert.alert('Lỗi', 'Email không hợp lệ'); return; }
    if (phoneNumber && !phoneNumber.match(/^[\d\s\-\+\(\)]{10,}$/)) { Alert.alert('Lỗi', 'Số điện thoại không hợp lệ'); return; }
    if (dateOfBirth && !dateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/)) { Alert.alert('Lỗi', 'Định dạng ngày sinh: YYYY-MM-DD'); return; }

    try {
      setIsSaving(true);
      const payload = {
        name,
        gender: editFormData.gender ?? true,
        email: email || user.email,
        phoneNumber: phoneNumber || user.phoneNumber,
        dateOfBirth: dateOfBirth || user.dateOfBirth,
      };
      const updated = await UserService.updateUser(userId, payload);
      setUser(updated);
      setIsEditModalVisible(false);
      Alert.alert('Thành công', 'Cập nhật thông tin thành công!');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.response?.data?.message || 'Không thể lưu hồ sơ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert('⚠️ Xóa tài khoản', `Xóa tài khoản "${user?.name}"? Không thể hoàn tác!`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            setIsDeleting(true);
            console.log('🗑️ [DeleteAccount] Deleting account:', userId);
            
            // Only call deleteAccount - backend handles cascade delete
            await UserService.deleteAccount(userId);
            
            console.log('✅ [DeleteAccount] Account deleted successfully');
            Alert.alert('✅ Thành công', 'Đã xóa tài khoản!');
            navigation.goBack();
          } catch (e: any) {
            console.error('❌ [DeleteAccount] Error:', e);
            console.error('❌ Status:', e?.response?.status);
            console.error('❌ Message:', e?.response?.data?.message);
            
            const msg = e?.response?.data?.message || e?.message || 'Không thể xóa tài khoản';
            Alert.alert('❌ Lỗi', msg);
          } finally {
            setIsDeleting(false);
          }
        }
      }
    ]);
  };

  const handleDeleteFriend = (id: string) => {
    Alert.alert('Xác nhận', 'Xóa mối quan hệ bạn bè này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await SocialService.deleteFriendship(id);
            setFriends(prev => prev.filter(f => f.id !== id));
          } catch { Alert.alert('Lỗi', 'Không thể xóa'); }
        }
      }
    ]);
  };

  const handleDeleteBlock = (id: string) => {
    Alert.alert('Xác nhận', 'Gỡ chặn này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Gỡ', style: 'destructive', onPress: async () => {
          try {
            await SocialService.deleteBlock(id);
            setBlocks(prev => prev.filter(b => b.id !== id));
          } catch { Alert.alert('Lỗi', 'Không thể gỡ chặn'); }
        }
      }
    ]);
  };

  const handleDeleteChat = (id: string) => {
    Alert.alert('Xác nhận', 'Xóa phòng chat này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await ChatService.deleteChat(id);
            setChats(prev => prev.filter(c => c.id !== id));
          } catch { Alert.alert('Lỗi', 'Không thể xóa chat'); }
        }
      }
    ]);
  };

  const handleDeleteRequest = (id: string) => {
    Alert.alert('Xác nhận', 'Xóa lời mời này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await SocialService.deleteFriendRequest(id);
            setRequests(prev => prev.filter(r => r.id !== id));
          } catch { Alert.alert('Lỗi', 'Không thể xóa lời mời'); }
        }
      }
    ]);
  };

  const ExpandableSection = ({ title, icon, count, children }: { title: string; icon: string; count: number; children: React.ReactNode }) => {
    const isExpanded = expandedSection === title;
    return (
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => setExpandedSection(isExpanded ? null : title)}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{count}</Text></View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.sectionBody}>
            {count === 0
              ? <Text style={styles.emptyText}>Không có dữ liệu</Text>
              : children}
          </View>
        )}
      </View>
    );
  };

  if (loading) return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.loadingBox}><ActivityIndicator size="large" color="#16a34a" /></View>
    </SafeAreaView>
  );

  if (!user) return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.loadingBox}><Text style={{ color: '#ef4444' }}>Không thể tải thông tin</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết User</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <TouchableOpacity onPress={() => setIsAvatarModalVisible(true)}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.uploadAvatarBtn}
            onPress={() => setIsAvatarModalVisible(true)}
          >
            <Text style={styles.uploadAvatarBtnText}>📸 Cập nhật ảnh</Text>
          </TouchableOpacity>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userId}>{user.id}</Text>

          <View style={styles.infoCard}>
            {[
              { icon: '📧', label: 'Email', value: user.email },
              { icon: '☎️', label: 'Điện thoại', value: user.phoneNumber },
              { icon: user.gender ? '👨' : '👩', label: 'Giới tính', value: user.gender ? 'Nam' : 'Nữ' },
              { icon: '🎂', label: 'Ngày sinh', value: user.dateOfBirth },
            ].map((item, i, arr) => (
              <View key={i}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>{item.icon}</Text>
                  <View>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={styles.infoValue}>{item.value || 'Chưa cập nhật'}</Text>
                  </View>
                </View>
                {i < arr.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.btnEdit]} onPress={handleOpenEdit}>
              <Text style={styles.actionBtnText}>✏️ Chỉnh sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.btnDelete]} onPress={handleDeleteAccount} disabled={isDeleting}>
              <Text style={styles.actionBtnText}>{isDeleting ? '⏳ Đang xóa...' : '🗑️ Xóa'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { icon: '👥', label: 'Bạn bè', count: friends.length },
            { icon: '🚫', label: 'Đã chặn', count: blocks.length },
            { icon: '💬', label: 'Chat', count: chats.length },
            { icon: '🤝', label: 'Lời mời', count: requests.length },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statCount}>{s.count}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Friends */}
        <ExpandableSection title="Bạn bè" icon="👥" count={friends.length}>
          {friends.map((f) => {
            const friendId = f.firstUserId === userId ? f.secondUserId : f.firstUserId;
            const friendProfile = friendDetails.get(friendId);
            const friendName = friendProfile?.name || friendId;
            return (
              <View key={f.id} style={styles.expandableListItem}>
                <View style={styles.expandableListAvatar}><Text style={styles.expandableListAvatarText}>{friendName.charAt(0).toUpperCase()}</Text></View>
                <View style={styles.expandableListInfo}>
                  <Text style={styles.expandableListTitle}>{friendName}</Text>
                  <Text style={styles.expandableListSub}>🤝 Kết bạn: {new Date(f.createdDate).toLocaleDateString('vi-VN')}</Text>
                  <Text style={styles.expandableListMeta}>📧 {friendProfile?.email || '?'} • 📱 {friendProfile?.phoneNumber || '?'}</Text>
                </View>
                <TouchableOpacity style={styles.listDeleteBtn} onPress={() => handleDeleteFriend(f.id)}>
                  <Text style={styles.listDeleteText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ExpandableSection>

        {/* Blocks */}
        <ExpandableSection title="Người bị chặn" icon="🚫" count={blocks.length}>
          {blocks.map((b) => (
            <View key={b.id} style={styles.listItem}>
              <View style={[styles.listAvatar, { backgroundColor: '#fee2e2' }]}><Text style={styles.listAvatarText}>{b.blockedId.charAt(0).toUpperCase()}</Text></View>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>{b.blockedId}</Text>
                <Text style={styles.listSub}>Chặn từ: {new Date(b.createdDate).toLocaleDateString('vi-VN')}</Text>
              </View>
              <TouchableOpacity style={[styles.listDeleteBtn, { backgroundColor: '#3b82f6' }]} onPress={() => handleDeleteBlock(b.id)}>
                <Text style={styles.listDeleteText}>Gỡ</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ExpandableSection>

        {/* Chats */}
        <ExpandableSection title="Phòng chat" icon="💬" count={chats.length}>
          {chats.map((c) => (
            <View key={c.id} style={styles.expandableListItem}>
              <View style={[styles.expandableListAvatar, { backgroundColor: '#dbeafe' }]}><Text style={styles.expandableListAvatarText}>{c.type === 'GROUP' ? '👥' : '💬'}</Text></View>
              <View style={styles.expandableListInfo}>
                <Text style={styles.expandableListTitle}>{c.name || 'Phòng chat không tên'}</Text>
                <Text style={styles.expandableListSub}>
                  {c.type === 'GROUP' ? '👥 Nhóm' : '💬 1-on-1'} • {c.status ? '✅ Hoạt động' : '❌ Dừng'}
                </Text>
                <Text style={styles.expandableListMeta}>
                  📅 Tạo: {new Date((c as any).createdDate || (c as any).createdAt || Date.now()).toLocaleDateString('vi-VN')} • 🆔 {(c as any).membersCount || '?'} thành viên
                </Text>
                {(c as any).ownerId && (
                  <Text style={styles.expandableListMeta}>👑 Chủ phòng: {(c as any).ownerId}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.listDeleteBtn} onPress={() => handleDeleteChat(c.id)}>
                <Text style={styles.listDeleteText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ExpandableSection>

        {/* Friend Requests */}
        <ExpandableSection title="Lời mời kết bạn" icon="🤝" count={requests.length}>
          {requests.map((r) => (
            <View key={r.id} style={styles.listItem}>
              <View style={[styles.listAvatar, { backgroundColor: '#fef3c7' }]}><Text style={styles.listAvatarText}>{r.senderId.charAt(0).toUpperCase()}</Text></View>
              <View style={styles.listInfo}>
                <Text style={styles.listTitle}>{r.senderId === userId ? `→ ${r.receiverId}` : `← ${r.senderId}`}</Text>
                <Text style={styles.listSub}>{r.status} • {new Date(r.createdDate).toLocaleDateString('vi-VN')}</Text>
              </View>
              <TouchableOpacity style={styles.listDeleteBtn} onPress={() => handleDeleteRequest(r.id)}>
                <Text style={styles.listDeleteText}>Xóa</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ExpandableSection>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="slide" onRequestClose={() => setIsEditModalVisible(false)}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
              <Text style={styles.modalCloseBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {[
              { label: '👤 Họ và tên *', key: 'name', placeholder: 'Nhập họ và tên', keyboard: 'default' },
              { label: '📧 Email', key: 'email', placeholder: 'Nhập email', keyboard: 'email-address' },
              { label: '☎️ Số điện thoại', key: 'phoneNumber', placeholder: 'Nhập số điện thoại', keyboard: 'phone-pad' },
              { label: '🎂 Ngày sinh (YYYY-MM-DD)', key: 'dateOfBirth', placeholder: 'Ví dụ: 2000-01-15', keyboard: 'default' },
            ].map((field) => (
              <View key={field.key} style={styles.formGroup}>
                <Text style={styles.formLabel}>{field.label}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={field.placeholder}
                  value={(editFormData as any)[field.key] || ''}
                  onChangeText={(text) => setEditFormData({ ...editFormData, [field.key]: text })}
                  keyboardType={field.keyboard as any}
                  editable={!isSaving}
                />
              </View>
            ))}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Giới tính</Text>
              <View style={styles.genderRow}>
                {[{ label: '👨 Nam', value: true }, { label: '👩 Nữ', value: false }].map((g) => (
                  <TouchableOpacity
                    key={String(g.value)}
                    style={[styles.genderBtn, editFormData.gender === g.value && styles.genderBtnActive]}
                    onPress={() => setEditFormData({ ...editFormData, gender: g.value })}
                  >
                    <Text style={styles.genderBtnText}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setIsEditModalVisible(false)} disabled={isSaving}>
                <Text style={styles.modalBtnCancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleSaveProfile} disabled={isSaving}>
                <Text style={styles.modalBtnSaveText}>{isSaving ? '⏳ Đang lưu...' : '✓ Lưu'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Avatar Upload Modal */}
      <Modal visible={isAvatarModalVisible} transparent animationType="fade" onRequestClose={() => setIsAvatarModalVisible(false)}>
        <View style={styles.avatarModalOverlay}>
          <View style={styles.avatarModalContent}>
            <Text style={styles.avatarModalTitle}>📸 Cập nhật ảnh đại diện</Text>
            
            <View style={styles.avatarPreviewBox}>
              {newAvatarUri ? (
                <Image source={{ uri: newAvatarUri }} style={styles.avatarModalPreview} />
              ) : avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarModalPreview} />
              ) : (
                <View style={styles.avatarModalPlaceholder}>
                  <Text style={styles.avatarModalPlaceholderText}>👤</Text>
                </View>
              )}
            </View>

            {newAvatarUri && (
              <Text style={styles.avatarModalHint}>✓ Đã chọn ảnh mới</Text>
            )}

            <TouchableOpacity
              style={styles.avatarModalPickBtn}
              onPress={pickAvatarImage}
              disabled={isUploadingAvatar}
            >
              <Text style={styles.avatarModalPickBtnText}>
                {isUploadingAvatar ? '⏳ Đang tải lên...' : '📁 Chọn ảnh từ thư viện'}
              </Text>
            </TouchableOpacity>

            <View style={styles.avatarModalBtnRow}>
              <TouchableOpacity
                style={[styles.avatarModalBtn, styles.avatarModalBtnCancel]}
                onPress={() => {
                  setIsAvatarModalVisible(false);
                  setNewAvatarUri(null);
                }}
                disabled={isUploadingAvatar}
              >
                <Text style={styles.avatarModalBtnCancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.avatarModalBtn, styles.avatarModalBtnSave, !newAvatarUri && { opacity: 0.5 }]}
                onPress={handleUploadAvatar}
                disabled={!newAvatarUri || isUploadingAvatar}
              >
                <Text style={styles.avatarModalBtnSaveText}>
                  {isUploadingAvatar ? '⏳' : '✓ Lưu'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { fontSize: 16, color: '#16a34a', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },

  body: { flex: 1, paddingHorizontal: 16 },

  userCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 16, marginBottom: 12,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  avatarImage: {
    width: 88, height: 88, borderRadius: 44,
    borderWidth: 3, borderColor: '#16a34a', marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#dcfce7',
    borderWidth: 3, borderColor: '#16a34a', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarEmoji: { fontSize: 36 },
  uploadAvatarBtn: {
    backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 8, 
    borderRadius: 6, marginBottom: 12,
  },
  uploadAvatarBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  userId: { fontSize: 12, color: '#9ca3af', marginBottom: 16 },

  infoCard: { width: '100%', backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { fontSize: 20 },
  infoLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },

  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnEdit: { backgroundColor: '#3b82f6' },
  btnDelete: { backgroundColor: '#ef4444' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statCount: { fontSize: 20, fontWeight: 'bold', color: '#16a34a' },
  statLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600', textAlign: 'center' },

  section: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  sectionBadge: { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#0369a1' },
  expandIcon: { fontSize: 12, color: '#9ca3af' },
  sectionBody: { borderTopWidth: 1, borderTopColor: '#f3f4f6', padding: 12 },
  emptyText: { textAlign: 'center', color: '#9ca3af', paddingVertical: 12, fontSize: 13 },

  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  listAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  listAvatarText: { fontWeight: 'bold', color: '#374151' },
  listInfo: { flex: 1 },
  listTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  listSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  
  expandableListItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  expandableListAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  expandableListAvatarText: { fontWeight: 'bold', fontSize: 18, color: '#374151' },
  expandableListInfo: { flex: 1 },
  expandableListTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  expandableListSub: { fontSize: 12, color: '#6b7280', marginBottom: 2, fontWeight: '500' },
  expandableListMeta: { fontSize: 10, color: '#9ca3af', marginTop: 2, fontStyle: 'italic' },
  listDeleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  listDeleteText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  modalSafeArea: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  modalCloseBtn: { fontSize: 22, color: '#9ca3af' },
  modalBody: { padding: 16 },

  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 },
  formInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, backgroundColor: '#f9fafb',
  },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1,
    borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#f9fafb',
  },
  genderBtnActive: { borderColor: '#16a34a', backgroundColor: '#dcfce7' },
  genderBtnText: { fontSize: 13, fontWeight: '600', color: '#111827' },

  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 24, paddingBottom: 32 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#e5e7eb' },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modalBtnSave: { backgroundColor: '#16a34a' },
  modalBtnSaveText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Avatar Upload Modal Styles
  avatarModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center',
  },
  avatarModalContent: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  avatarModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16, textAlign: 'center' },
  avatarPreviewBox: { alignItems: 'center', marginBottom: 16 },
  avatarModalPreview: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#16a34a' },
  avatarModalPlaceholder: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#dcfce7',
    borderWidth: 2, borderColor: '#16a34a', justifyContent: 'center', alignItems: 'center',
  },
  avatarModalPlaceholderText: { fontSize: 48 },
  avatarModalHint: { textAlign: 'center', color: '#16a34a', fontSize: 12, fontWeight: '600', marginBottom: 12 },
  avatarModalPickBtn: {
    backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 8, marginBottom: 16,
    alignItems: 'center',
  },
  avatarModalPickBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  avatarModalBtnRow: { flexDirection: 'row', gap: 12 },
  avatarModalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  avatarModalBtnCancel: { backgroundColor: '#e5e7eb' },
  avatarModalBtnCancelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  avatarModalBtnSave: { backgroundColor: '#16a34a' },
  avatarModalBtnSaveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default UserDetailScreen;