// src/screens/ChatsScreen.tsx
// Sandeshaa Android – Chats List Screen

import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {RootStackParamList} from '../navigation/AppNavigator';

import {API_BASE_URL as API_BASE} from '../config';
import {getToken, deleteToken, getSavedChats, saveChatsList} from '../storage';
import {clearIdentityKeys} from '../crypto';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chats'>;
};

type Chat = {
  username: string;
  lastMessage: string;
  lastMessageTime: string | null;
  unread: number;
};

export default function ChatsScreen({navigation}: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  // Reload chats when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadCurrentUsername();
      loadChatsFromBackend();
    }, []),
  );

  async function loadCurrentUsername() {
    try {
      const token = await getToken();
      if (token) {
        const res = await fetch(`${API_BASE}/me`, {
          headers: {Authorization: `Bearer ${token}`},
        });
        const data = await res.json();
        setCurrentUsername(data.username);
      }
    } catch (e) {
      console.error('Failed to load username:', e);
    }
  }

  async function loadChatsFromBackend() {
    try {
      const token = await getToken();
      if (!token) {
        const saved = await getSavedChats();
        setChats(saved);
        return;
      }

      const conversationsRes = await fetch(`${API_BASE}/conversations`, {
        headers: {Authorization: `Bearer ${token}`},
      });

      if (!conversationsRes.ok) {
        console.error('Failed to fetch conversations');
        const saved = await getSavedChats();
        setChats(saved);
        return;
      }

      const conversations = await conversationsRes.json();

      const loadedChats: Chat[] = conversations.map((conv: any) => ({
        username: conv.username,
        lastMessage: 'Recent conversation',
        lastMessageTime: conv.last_message_time,
        unread: 0,
      }));

      setChats(loadedChats);
      await saveChatsList(loadedChats);
    } catch (e) {
      console.error('Failed to load chats:', e);
      const saved = await getSavedChats();
      setChats(saved);
    }
  }

  function startNewChat() {
    const username = newChatUsername.trim();
    if (!username) {
      return;
    }

    if (username === currentUsername) {
      Alert.alert('Error', "You can't chat with yourself!");
      return;
    }

    const existingChat = chats.find(c => c.username === username);
    if (existingChat) {
      navigation.navigate('Chat', {to: username});
      setShowModal(false);
      setNewChatUsername('');
      return;
    }

    const newChat: Chat = {
      username,
      lastMessage: 'No messages yet',
      lastMessageTime: null,
      unread: 0,
    };

    const updatedChats = [newChat, ...chats];
    saveChatsList(updatedChats);
    setChats(updatedChats);
    setShowModal(false);
    setNewChatUsername('');
    navigation.navigate('Chat', {to: username});
  }

  function deleteChat(username: string) {
    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete all messages with ${username}? This will remove messages from the server and cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDeleteChat(username),
        },
      ],
    );
  }

  async function performDeleteChat(username: string) {
    try {
      const token = await getToken();

      if (token) {
        const res = await fetch(
          `${API_BASE}/messages/${encodeURIComponent(username)}`,
          {
            method: 'DELETE',
            headers: {Authorization: `Bearer ${token}`},
          },
        );

        if (res.ok) {
          const data = await res.json();
          console.log(`✅ Deleted ${data.deleted_count} messages from server`);
        }
      }

      const updatedChats = chats.filter(c => c.username !== username);
      setChats(updatedChats);
      await saveChatsList(updatedChats);

      Alert.alert('Deleted', `Chat with ${username} has been deleted.`);
    } catch (e) {
      console.error('Delete chat error:', e);
      Alert.alert('Error', 'Failed to delete chat. Please try again.');
    }
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await deleteToken();
          await clearIdentityKeys();
          navigation.reset({
            index: 0,
            routes: [{name: 'Login'}],
          });
        },
      },
    ]);
  }

  function formatTime(iso: string | null) {
    if (!iso) {
      return '';
    }
    const date = new Date(iso);
    const now = new Date();
    const sameDay =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (sameDay) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
    });
  }

  const renderChatItem = ({item}: {item: Chat}) => (
    <Pressable
      style={styles.chatItem}
      onPress={() => navigation.navigate('Chat', {to: item.username})}
      onLongPress={() => deleteChat(item.username)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.username.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatUsername}>{item.username}</Text>
          <Text style={styles.chatTime}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <View style={styles.chatSubRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#667eea" barStyle="light-content" />

      {/* Custom Header */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.appName}>Sandeshaa</Text>
          {currentUsername && (
            <Text style={styles.welcomeText}>
              Welcome, {currentUsername}
            </Text>
          )}
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {/* New Chat Button */}
      <Pressable
        style={styles.newChatBtn}
        onPress={() => setShowModal(true)}>
        <Text style={styles.newChatText}>+ New Chat</Text>
      </Pressable>

      {/* Chat List */}
      {chats.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>
            Tap "New Chat" to start messaging
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.username}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* New Chat Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowModal(false)}>
          <Pressable
            style={styles.modalContent}
            onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Start New Chat</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter username"
              placeholderTextColor="#999"
              value={newChatUsername}
              onChangeText={setNewChatUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              onSubmitEditing={startNewChat}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowModal(false);
                  setNewChatUsername('');
                }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.startBtn]}
                onPress={startNewChat}>
                <Text style={styles.startBtnText}>Start Chat</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  welcomeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  newChatBtn: {
    backgroundColor: '#667eea',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newChatText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#888',
    textAlign: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatUsername: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  chatSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    color: '#888',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#e0e0e0',
  },
  cancelBtnText: {
    color: '#333',
    fontWeight: '600',
  },
  startBtn: {
    backgroundColor: '#667eea',
  },
  startBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
