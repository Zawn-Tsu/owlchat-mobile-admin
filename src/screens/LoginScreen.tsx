import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';


const LoginScreen: React.FC = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

 const handleLogin = async () => {
  
  try {
     setErrorMessage(''); 
    await login(username, password);

  } catch (error: any) {
    setErrorMessage(error.message);
  }
};

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Logo */}
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

        {/* Form */}
        <View style={styles.form}>
          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên đăng nhập</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nhập username"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập mật khẩu"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
          {/* Forgot */}
          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          {/* Button */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
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

  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },

  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: '#16a34a',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#16a34a',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },

  logo: {
    width: 42,
    height: 42,
  },

  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1f2937',
  },
  errorText: {
    color: 'red',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
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

  inputGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
    fontWeight: '500',
  },

  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 14,
  },

  forgotBtn: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
//test
  forgotText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },

  loginBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
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