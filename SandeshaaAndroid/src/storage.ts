// src/storage.ts
// Sandeshaa Android – Secure token storage
// Replaces: expo-secure-store → react-native-keychain + AsyncStorage

import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_SERVICE = 'sandeshaa_access_token';

// ---- Secure Token Storage (via Keychain) ----

export async function getToken(): Promise<string | null> {
  try {
    const result = await Keychain.getGenericPassword({service: TOKEN_SERVICE});
    if (result && result.password) {
      return result.password;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await Keychain.setGenericPassword(TOKEN_SERVICE, token, {
    service: TOKEN_SERVICE,
  });
}

export async function deleteToken(): Promise<void> {
  await Keychain.resetGenericPassword({service: TOKEN_SERVICE});
}

// ---- AsyncStorage helpers (non-sensitive data like chats list) ----

export async function getStorageItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setStorageItem(
  key: string,
  value: string,
): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function deleteStorageItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

// ---- Message Cache (for sent messages, so we can display our own) ----

export async function cacheMessagePlaintext(
  otherUsername: string,
  messageId: string,
  plaintext: string,
): Promise<void> {
  const key = `msg_cache_${otherUsername}_${messageId}`;
  await AsyncStorage.setItem(key, plaintext);
}

export async function getCachedMessagePlaintext(
  otherUsername: string,
  messageId: string,
): Promise<string | null> {
  const key = `msg_cache_${otherUsername}_${messageId}`;
  return AsyncStorage.getItem(key);
}

// ---- Chats list persistence ----

export async function getSavedChats(): Promise<any[]> {
  try {
    const data = await AsyncStorage.getItem('saved_chats');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveChatsList(chats: any[]): Promise<void> {
  await AsyncStorage.setItem('saved_chats', JSON.stringify(chats));
}

// ---- Full logout cleanup ----

export async function clearAllStorage(): Promise<void> {
  await deleteToken();
  await AsyncStorage.removeItem('saved_chats');
  // Note: identity keys are cleared separately via crypto.clearIdentityKeys()
}
