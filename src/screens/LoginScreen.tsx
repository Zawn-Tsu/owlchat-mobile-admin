import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      await login(username, password);
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid credentials');
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo + Title */}
      <View style={styles.logoSection}>
        <View style={styles.logoBox}>
          <Image
            source={require("../assets/owl-32.png")}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>OwlAdmin</Text>
        <Text style={styles.subtitle}>HỆ THỐNG QUẢN TRỊ</Text>
      </View>

      {/* Username */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tên đăng nhập</Text>
        <TextInput
          style={styles.input}
          placeholder="admin_owl"
          value={username}
          onChangeText={setUsername}
        />
      </View>

      {/* Password */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* Forgot password */}
      <TouchableOpacity style={styles.forgotBtn}>
        <Text style={styles.forgotText}>Quên mật khẩu?</Text>
      </TouchableOpacity>

      {/* Button */}
      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
        <Text style={styles.loginBtnText}>Đăng nhập Admin →</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 OwlChat Global Services</Text>
        <Text style={styles.footerSub}>PHIÊN BẢN ADMIN MOBILE V1.0</Text>
      </View>
    </View>
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
    marginBottom: 40,
  },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: '#16a34a',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 14,
  },
  forgotBtn: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '500',
  },
  loginBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
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