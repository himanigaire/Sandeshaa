// src/screens/LoginScreen.tsx
// Sandeshaa Android – Login Screen
// Replaces: expo-router → React Navigation
// Replaces: expo-secure-store → src/storage.ts

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';

import {apiPost, apiPut} from '../api';
import {setToken} from '../storage';
import {ensureIdentityKeypair, getIdentityPublicKeyB64} from '../crypto';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({navigation}: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);

    try {
      // 1. Login to get token
      const res = await apiPost('/login', {username, password});

      // 2. Save token securely
      await setToken(res.access_token);

      // 3. Ensure keypair exists
      await ensureIdentityKeypair();

      // 4. Sync public key with server
      const myPublicKey = await getIdentityPublicKeyB64();
      try {
        await apiPut(
          '/me/public-key',
          {identity_public_key: myPublicKey},
          res.access_token,
        );
        console.log('🔑 Public key synced with server');
      } catch (e) {
        console.warn('⚠️ Could not sync public key:', e);
      }

      console.log('✅ LOGIN SUCCESS');

      // 5. Navigate to chats
      navigation.reset({
        index: 0,
        routes: [{name: 'Chats'}],
      });
    } catch (e: any) {
      console.error('❌ Login error:', e);
      const msg =
        e.response?.data?.detail || e.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>Sandeshaa</Text>
          <Text style={styles.subtitle}>Secure Messaging</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Login</Text>

          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Logging in...' : 'Login'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Register')}
            disabled={loading}>
            <Text style={styles.link}>
              Don't have an account? Create one
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#667eea',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 20,
    textAlign: 'center',
    color: '#667eea',
    fontSize: 14,
  },
  error: {
    color: '#B00020',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
});
