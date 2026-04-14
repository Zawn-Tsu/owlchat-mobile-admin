import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, TextInput, Alert, ScrollView,
} from 'react-native';
import { apiClient } from '../services/apiClient';

// ─── Validation Functions ─────────────────────────────────────────────────────
const validateUsername = (value: string) => {
  if (!value) return { valid: false, message: 'Username không được để trống' };
  if (value.trim().length < 3) return { valid: false, message: 'Username phải có ít nhất 3 ký tự' };
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return { valid: false, message: 'Username chỉ chứa chữ, số, dấu gạch dưới' };
  return { valid: true, message: '' };
};

const validatePassword = (value: string) => {
  if (!value) return { valid: false, message: 'Mật khẩu không được để trống' };
  if (value.length < 6) return { valid: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
  if (!/(?=.*[a-z])/.test(value) || !/(?=.*[A-Z])/.test(value) || !/(?=.*\d)/.test(value)) {
    return { valid: false, message: 'Phải chứa chữ hoa, chữ thường, và số' };
  }
  return { valid: true, message: '✓ Mật khẩu hợp lệ' };
};

const validateConfirmPassword = (password: string, confirmPassword: string) => {
  if (!confirmPassword) return { valid: false, message: 'Xác nhận mật khẩu không được để trống' };
  if (password !== confirmPassword) return { valid: false, message: 'Mật khẩu không khớp' };
  return { valid: true, message: '✓ Mật khẩu trùng khớp' };
};

const validateName = (value: string) => {
  if (!value) return { valid: false, message: 'Tên không được để trống' };
  if (value.trim().length < 2) return { valid: false, message: 'Tên phải có ít nhất 2 ký tự' };
  return { valid: true, message: '✓ Tên hợp lệ' };
};

const validateEmail = (value: string) => {
  if (!value) return { valid: false, message: 'Email không được để trống' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) return { valid: false, message: 'Email không hợp lệ (vd: user@example.com)' };
  return { valid: true, message: '✓ Email hợp lệ' };
};

const validatePhone = (value: string) => {
  if (!value) return { valid: false, message: 'Số điện thoại không được để trống' };
  if (value.trim().length < 8) return { valid: false, message: 'Số điện thoại phải có ít nhất 8 ký tự' };
  if (!/^\d+$/.test(value)) return { valid: false, message: 'Số điện thoại chỉ chứa chữ số' };
  return { valid: true, message: '✓ Số điện thoại hợp lệ' };
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
const CreateUserScreen: React.FC = ({ navigation }: any) => {
  const [step, setStep] = useState(1); // 1 = account, 2 = profile
  const [loading, setLoading] = useState(false);

  // Account fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  // Validation for account fields
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Profile fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');

  // Validation for profile fields
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const [accountData, setAccountData] = useState<any>(null);

  // Real-time validation handlers
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    const validation = validateUsername(value);
    setUsernameError(validation.message);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    const validation = validatePassword(value);
    setPasswordError(validation.message);
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    const validation = validateConfirmPassword(password, value);
    setConfirmPasswordError(validation.message);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    const validation = validateName(value);
    setNameError(validation.message);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    const validation = validateEmail(value);
    setEmailError(validation.message);
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    const validation = validatePhone(value);
    setPhoneError(validation.message);
  };

  const handleCreateAccount = async () => {
    // Validate all fields
    const usernameVal = validateUsername(username);
    const passwordVal = validatePassword(password);
    const confirmVal = validateConfirmPassword(password, confirmPassword);

    setUsernameError(usernameVal.message);
    setPasswordError(passwordVal.message);
    setConfirmPasswordError(confirmVal.message);

    if (!usernameVal.valid || !passwordVal.valid || !confirmVal.valid) {
      Alert.alert('⚠️ Có lỗi', 'Vui lòng điền đúng tất cả các trường');
      return;
    }

    // Store account data and move to step 2
    setAccountData({
      username: username.trim(),
      password,
      role,
    });
    setStep(2);
  };

  const handleCreateProfile = async () => {
    // Validate all fields
    const nameVal = validateName(name);
    const emailVal = validateEmail(email);
    const phoneVal = validatePhone(phone);

    setNameError(nameVal.message);
    setEmailError(emailVal.message);
    setPhoneError(phoneVal.message);

    if (!nameVal.valid || !emailVal.valid || !phoneVal.valid) {
      Alert.alert('⚠️ Có lỗi', 'Vui lòng điền đúng tất cả các trường');
      return;
    }

    if (!accountData?.username) {
      Alert.alert('Lỗi', 'Không có account info. Vui lòng quay lại và tạo account lại.');
      return;
    }

    setLoading(true);
    try {
      // POST /user with nested structure: { account: {...}, userProfile: {...} }
      const requestData = {
        account: {
          username: accountData.username,
          password: accountData.password,
          role: accountData.role,
        },
        userProfile: {
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phone.trim(),
        },
      };

      // Add optional dateOfBirth if provided
      if (dob) requestData.userProfile.dateOfBirth = dob;

      console.log('📤 Creating user with data:', JSON.stringify(requestData, null, 2));

      const res = await apiClient.user.post('/user', requestData);
      console.log('✅ User created successfully:', res.data);
      
      Alert.alert(
        'Thành công',
        `Tài khoản "${accountData.username}" đã được tạo!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setStep(1);
              setUsername('');
              setPassword('');
              setConfirmPassword('');
              setRole('USER');
              setName('');
              setEmail('');
              setPhone('');
              setDob('');
              setAccountData(null);
              navigation?.goBack();
            },
          },
        ]
      );
    } catch (e: any) {
      console.error('❌ Create user error:', e);
      console.error('❌ Response status:', e?.response?.status);
      console.error('❌ Response data:', e?.response?.data);
      const msg = e?.response?.data?.message || e?.message || 'Không thể tạo tài khoản.';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={styles.backBtn}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo tài khoản mới</Text>
        <Text style={styles.headerSub}>
          {step === 1 ? 'Bước 1: Tài khoản' : 'Bước 2: Hồ sơ'}
        </Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          // STEP 1: Account creation
          <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
            <Text style={styles.sectionTitle}>📋 Thông tin tài khoản</Text>

            {/* Username */}
            <View style={styles.field}>
              <Text style={styles.label}>Username *</Text>
              <TextInput
                style={[styles.input, usernameError && styles.inputError]}
                placeholder="Ít nhất 3 ký tự"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={handleUsernameChange}
                editable={!loading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameError && (
                <Text style={[styles.errorText, !validateUsername(username).valid && styles.errorTextActive]}>
                  {usernameError}
                </Text>
              )}
              {!usernameError && username && (
                <Text style={styles.helperTextSuccess}>✓ Username hợp lệ</Text>
              )}
              {!username && (
                <Text style={styles.helperText}>Chỉ chứa chữ, số, dấu gạch dưới (_)</Text>
              )}
            </View>

            {/* Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Mật khẩu *</Text>
              <TextInput
                style={[styles.input, passwordError && styles.inputError]}
                placeholder="Ít nhất 6 ký tự"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={handlePasswordChange}
                editable={!loading}
                secureTextEntry
              />
              {passwordError && (
                <Text style={[styles.errorText, !validatePassword(password).valid && styles.errorTextActive]}>
                  {passwordError}
                </Text>
              )}
              {!passwordError && password && (
                <Text style={styles.helperTextSuccess}>✓ {passwordError || 'Mật khẩu hợp lệ'}</Text>
              )}
              {!password && (
                <Text style={styles.helperText}>Phải chứa: chữ hoa, chữ thường, số (min 6 ký tự)</Text>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.field}>
              <Text style={styles.label}>Xác nhận mật khẩu *</Text>
              <TextInput
                style={[styles.input, confirmPasswordError && !validateConfirmPassword(password, confirmPassword).valid && styles.inputError]}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={handleConfirmPasswordChange}
                editable={!loading}
                secureTextEntry
              />
              {confirmPasswordError && !validateConfirmPassword(password, confirmPassword).valid && (
                <Text style={[styles.errorText, styles.errorTextActive]}>
                  {confirmPasswordError}
                </Text>
              )}
              {confirmPasswordError && validateConfirmPassword(password, confirmPassword).valid && (
                <Text style={styles.helperTextSuccess}>✓ {confirmPasswordError}</Text>
              )}
            </View>

            {/* Role */}
            <View style={styles.field}>
              <Text style={styles.label}>Vai trò *</Text>
              <TouchableOpacity
                style={styles.roleBtn}
                onPress={() => setShowRoleMenu(!showRoleMenu)}
                disabled={loading}
              >
                <Text style={styles.roleBtnText}>
                  {role === 'USER' ? '👤 Người dùng' : role === 'MOD' ? '🛡️ Quản trị viên' : '👑 Admin'}
                </Text>
                <Text style={{ marginLeft: 'auto', fontSize: 16 }}>▼</Text>
              </TouchableOpacity>

              {showRoleMenu && !loading && (
                <View style={styles.roleMenu}>
                  {['USER', 'MOD', 'ADMIN'].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleMenuItem, role === r && styles.roleMenuItemActive]}
                      onPress={() => {
                        setRole(r);
                        setShowRoleMenu(false);
                      }}
                    >
                      <Text style={[styles.roleMenuText, role === r && styles.roleMenuTextActive]}>
                        {r === 'USER' ? '👤 Người dùng' : r === 'MOD' ? '🛡️ Quản trị viên' : '👑 Admin'}
                      </Text>
                      {role === r && <Text style={{ marginLeft: 'auto' }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleCreateAccount}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Tiếp theo →</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // STEP 2: Profile creation
          <View style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
            <Text style={styles.sectionTitle}>👤 Thông tin hồ sơ</Text>

            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Tên đầy đủ *</Text>
              <TextInput
                style={[styles.input, nameError && styles.inputError]}
                placeholder="Nhập tên"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={handleNameChange}
                editable={!loading}
              />
              {nameError && (
                <Text style={[styles.errorText, !validateName(name).valid && styles.errorTextActive]}>
                  {nameError}
                </Text>
              )}
              {!nameError && name && (
                <Text style={styles.helperTextSuccess}>✓ {nameError || 'Tên hợp lệ'}</Text>
              )}
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                placeholder="example@email.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={handleEmailChange}
                editable={!loading}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {emailError && (
                <Text style={[styles.errorText, !validateEmail(email).valid && styles.errorTextActive]}>
                  {emailError}
                </Text>
              )}
              {!emailError && email && (
                <Text style={styles.helperTextSuccess}>✓ {emailError || 'Email hợp lệ'}</Text>
              )}
              {!email && (
                <Text style={styles.helperText}>Định dạng: user@example.com</Text>
              )}
            </View>

            {/* Phone */}
            <View style={styles.field}>
              <Text style={styles.label}>Số điện thoại *</Text>
              <TextInput
                style={[styles.input, phoneError && styles.inputError]}
                placeholder="0xxxxxxxxx"
                placeholderTextColor="#9ca3af"
                value={phone}
                onChangeText={handlePhoneChange}
                editable={!loading}
                keyboardType="phone-pad"
              />
              {phoneError && (
                <Text style={[styles.errorText, !validatePhone(phone).valid && styles.errorTextActive]}>
                  {phoneError}
                </Text>
              )}
              {!phoneError && phone && (
                <Text style={styles.helperTextSuccess}>✓ {phoneError || 'Số điện thoại hợp lệ'}</Text>
              )}
              {!phone && (
                <Text style={styles.helperText}>Chỉ chứa chữ số, ít nhất 8 ký tự</Text>
              )}
            </View>

            {/* Date of Birth */}
            <View style={styles.field}>
              <Text style={styles.label}>Ngày sinh (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2000-01-15"
                placeholderTextColor="#9ca3af"
                value={dob}
                onChangeText={setDob}
                editable={!loading}
              />
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1, backgroundColor: '#f3f4f6' }]}
                onPress={() => setStep(1)}
                disabled={loading}
              >
                <Text style={[styles.submitBtnText, { color: '#374151' }]}>← Quay lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1 }, loading && styles.submitBtnDisabled]}
                onPress={handleCreateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>✓ Tạo tài khoản</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#16a34a' },
  header: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSub: {
    color: '#bbf7d0',
    fontSize: 12,
  },

  body: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },

  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },

  roleBtn: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBtnText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },

  roleMenu: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    zIndex: 10,
  },
  roleMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  roleMenuItemActive: {
    backgroundColor: '#f0fdf4',
  },
  roleMenuText: {
    fontSize: 13,
    color: '#374151',
  },
  roleMenuTextActive: {
    color: '#16a34a',
    fontWeight: '600',
  },

  submitBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
    fontWeight: '500',
  },
  errorTextActive: {
    color: '#dc2626',
  },

  helperText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 6,
    fontStyle: 'italic',
  },

  helperTextSuccess: {
    fontSize: 12,
    color: '#16a34a',
    marginTop: 6,
    fontWeight: '500',
  },
});

export default CreateUserScreen;
