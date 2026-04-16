import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // ── Owl animation state ─────────────────────────────────────────────
  // 0 = open eyes | 1 = cover eyes | 2 = peek
  const owlAnim = useState(new Animated.Value(0))[0];

  const setOwlState = (to: number) => {
    Animated.timing(owlAnim, {
      toValue: to,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const owlOpenOpacity = owlAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1, 0, 0],
  });

  const owlCoverOpacity = owlAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 0],
  });

  const owlPeekOpacity = owlAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 0, 1],
  });

  // ── Validation ──────────────────────────────────────────────────────
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

  // ── Submit ──────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (showPassword) {
      setOwlState(2); // peek
    } else {
      setOwlState(1); // cover
    }
    if (!validate()) return;
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (error: any) {
      // Lấy error message từ AuthContext
      const backendMsg = error?.message || '';
      
      console.log('🔴 Backend Error Message:', backendMsg);

      // Chuyển hóa error message từ backend thành tiếng Việt
      if (backendMsg.toLowerCase().includes('account not found')) {
        setErrorMessage('❌ Tài khoản không tồn tại');
        setUsernameError('Không tìm thấy tài khoản này');
        setPasswordError('');
      } 
      else if (backendMsg.toLowerCase().includes('invalid password')) {
        setErrorMessage('❌ Sai mật khẩu');
        setUsernameError('');
        setPasswordError('Mật khẩu không chính xác');
      } 
      else if (backendMsg.toLowerCase().includes('ban')) {
        setErrorMessage('❌ Tài khoản đã bị khóa');
        setUsernameError('');
        setPasswordError('');
      }
      else if (backendMsg.toLowerCase().includes('admin')) {
        setErrorMessage('❌ Tài khoản này không phải admin');
        setUsernameError('');
        setPasswordError('');
      }
      else {
        setErrorMessage('❌ Đăng nhập thất bại: ' + backendMsg);
        setUsernameError('');
        setPasswordError('');
      }
    } finally {
      setLoading(false);
    }
  };

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

        {/* ── Owl Logo ── */}
        <View style={styles.logoSection}>
          <View style={styles.logoBox}>
            <Animated.Image
              source={require('../assets/assets/owl_open.png')}
              style={[styles.logo, { opacity: owlOpenOpacity, position: 'absolute' }]}
            />
            <Animated.Image
              source={require('../assets/assets/owl_cover.png')}
              style={[styles.logo, { opacity: owlCoverOpacity, position: 'absolute' }]}
            />
            <Animated.Image
              source={require('../assets/assets/owl_peek.png')}
              style={[styles.logo, { opacity: owlPeekOpacity, position: 'absolute' }]}
            />
          </View>
          <Text style={styles.title}>OwlAdmin</Text>
          <Text style={styles.subtitle}>HỆ THỐNG QUẢN TRỊ</Text>
        </View>

        {/* ── Form ── */}
        <View style={styles.form}>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerIcon}>⚠️</Text>
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên đăng nhập</Text>
            <View style={[styles.inputWrap, usernameError && styles.inputWrapError]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập username"
                value={username}
                onChangeText={onChangeUsername}
                onFocus={() => setOwlState(0)}
                autoCapitalize="none"
                editable={!loading}
              />
            </View>
            {usernameError && <Text style={styles.fieldError}>{usernameError}</Text>}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <View style={[styles.inputWrap, passwordError && styles.inputWrapError]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={onChangePassword}
                onFocus={() => {
                  if (showPassword) setOwlState(2);
                  else setOwlState(1);
                }}
                onBlur={() => {
                  if (showPassword) {
                    setOwlState(2); // 👁️ vẫn peek
                  } else {
                    setOwlState(0);
                  }
                }}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => {
                setShowPassword(prev => {
                    const next = !prev;
                    setOwlState(next ? 2 : 1);
                    return next;
                  });
                }}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnLoading]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 OwlChat</Text>
          <Text style={styles.footerSub}>Admin Mobile v1.0</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
 
logoBox: {
  width: 110,
  height: 110,
  backgroundColor: '#16a34a',
  borderRadius: 28,
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 12,
  shadowColor: '#16a34a',
  shadowOpacity: 0.35,
  shadowRadius: 12,
  elevation: 8,
},

logo: {
  width: 70,
  height: 70,
},

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    letterSpacing: 1,
  },

  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#dc2626',
    padding: 12,
    marginBottom: 16,
  },
  errorBannerIcon: { fontSize: 18 },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
    fontWeight: '600',
  },

  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: '500',
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  inputWrapError: {
    borderColor: '#dc2626',
    backgroundColor: '#fee2e2',
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 12,
    padding: 0,
  },

  eyeBtn: { paddingLeft: 8 },
  eyeIcon: { fontSize: 16 },

  fieldError: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '600',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  loginBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  loginBtnLoading: {
    backgroundColor: '#4ade80',
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    fontSize: 10,
    color: '#9ca3af',
  },
  footerSub: {
    fontSize: 10,
    color: '#d1d5db',
    marginTop: 4,
  },
});
export default LoginScreen;