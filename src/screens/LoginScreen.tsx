import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // field-level errors
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    let valid = true;
    setUsernameError('');
    setPasswordError('');
    setErrorMessage('');

    if (!username.trim()) {
      setUsernameError('Vui lòng nhập tên đăng nhập');
      valid = false;
    } else if (username.trim().length < 3) {
      setUsernameError('Tên đăng nhập tối thiểu 3 ký tự');
      valid = false;
    }

    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Mật khẩu tối thiểu 6 ký tự');
      valid = false;
    }

    return valid;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (error: any) {
      // Map common error codes to friendly messages
      const msg: string = error?.message ?? '';
      if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid')) {
        setErrorMessage('Tên đăng nhập hoặc mật khẩu không đúng');
      } else if (msg.includes('403')) {
        setErrorMessage('Tài khoản không có quyền truy cập admin');
      } else if (msg.includes('Network') || msg.includes('network') || msg.includes('timeout')) {
        setErrorMessage('Không thể kết nối máy chủ. Kiểm tra lại mạng.');
      } else if (msg.includes('500') || msg.includes('server')) {
        setErrorMessage('Lỗi máy chủ. Vui lòng thử lại sau.');
      } else {
        setErrorMessage(msg || 'Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // clear error khi user bắt đầu gõ lại
  const onChangeUsername = (v: string) => {
    setUsername(v);
    if (usernameError) setUsernameError('');
    if (errorMessage) setErrorMessage('');
  };

  const onChangePassword = (v: string) => {
    setPassword(v);
    if (passwordError) setPasswordError('');
    if (errorMessage) setErrorMessage('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>

        {/* ── Logo ── */}
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <Image
              source={require('../assets/owl-32.png')}
              style={styles.logo}
            />
          </View>
          <Text style={styles.title}>OwlAdmin</Text>
          <Text style={styles.subtitle}>HỆ THỐNG QUẢN TRỊ</Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>

          {/* Global error banner */}
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerIcon}>⚠️</Text>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên đăng nhập</Text>
            <View style={[
              styles.inputWrap,
              usernameError ? styles.inputWrapError : null,
            ]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập username"
                placeholderTextColor="#c4c4c4"
                value={username}
                onChangeText={onChangeUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                editable={!loading}
              />
            </View>
            {usernameError ? (
              <Text style={styles.fieldError}>{usernameError}</Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={[
              styles.inputWrap,
              passwordError ? styles.inputWrapError : null,
            ]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#c4c4c4"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={onChangePassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(p => !p)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={styles.fieldError}>{passwordError}</Text>
            ) : null}
          </View>

          {/* Forgot */}
          <TouchableOpacity style={styles.forgotBtn} disabled={loading}>
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnLoading]}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loginBtnText}>Đang đăng nhập...</Text>
              </View>
            ) : (
              <Text style={styles.loginBtnText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 OwlChat</Text>
          <Text style={styles.footerSub}>Admin Mobile v1.0</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // ── Logo ──────────────────────────────────────────────────────────────────
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoBox: {
    width: 80, height: 80,
    backgroundColor: '#16a34a',
    borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#16a34a', shadowOpacity: 0.3,
    shadowRadius: 10, elevation: 6,
  },
  logo: { width: 42, height: 42 },
  title: { fontSize: 26, fontWeight: '900', color: '#1f2937' },
  subtitle: { fontSize: 12, color: '#9ca3af', marginTop: 4, letterSpacing: 1 },

  // ── Form card ─────────────────────────────────────────────────────────────
  form: {
    backgroundColor: '#fff',
    padding: 20, borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 10, elevation: 3,
  },

  // Global error banner
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 10,
    borderWidth: 1, borderColor: '#fecaca',
    padding: 10, marginBottom: 16,
  },
  errorBannerIcon: { fontSize: 16 },
  errorBannerText: { flex: 1, fontSize: 13, color: '#dc2626', fontWeight: '500' },

  // Input group
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, color: '#6b7280', marginBottom: 6, fontWeight: '500' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  inputWrapError: { borderColor: '#f87171', backgroundColor: '#fff5f5' },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: {
    flex: 1, fontSize: 14, color: '#111827',
    paddingVertical: 12, padding: 0,
  },
  eyeBtn: { paddingLeft: 8 },
  eyeIcon: { fontSize: 16 },

  // Field-level error
  fieldError: {
    fontSize: 11, color: '#ef4444',
    marginTop: 5, marginLeft: 4,
  },

  // Forgot
  forgotBtn: { alignItems: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { fontSize: 12, color: '#16a34a', fontWeight: '500' },

  // Login button
  loginBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  loginBtnLoading: { backgroundColor: '#4ade80' },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Footer
  footer: { alignItems: 'center', marginTop: 30 },
  footerText: { fontSize: 10, color: '#9ca3af' },
  footerSub: { fontSize: 10, color: '#d1d5db', marginTop: 4 },
});