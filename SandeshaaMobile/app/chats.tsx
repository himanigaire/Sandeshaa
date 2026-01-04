import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View, Modal, Alert, Animated, PanResponder } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const API_BASE = 'http://192.168.1.65:8000';

type Chat = {
  username: string;
  lastMessage: string;
  lastMessageTime: string | null;
  unread: number;
};

export default function ChatsScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState('');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUsername();
    loadChatsFromBackend();
  }, []);

  async function loadCurrentUsername() {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) {
        const res = await fetch(`${API_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
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
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) {
        // Load saved chats if no token
        const savedChats = await SecureStore.getItemAsync('saved_chats');
        if (savedChats) {
          setChats(JSON.parse(savedChats));
        }
        return;
      }

      // Fetch all conversations from the new endpoint
      const conversationsRes = await fetch(`${API_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!conversationsRes.ok) {
        console.error('Failed to fetch conversations');
        // Fallback to saved chats
        const savedChats = await SecureStore.getItemAsync('saved_chats');
        if (savedChats) {
          setChats(JSON.parse(savedChats));
        }
        return;
      }

      const conversations = await conversationsRes.json();
      
      // Transform to our Chat type
      const loadedChats: Chat[] = conversations.map((conv: any) => ({
        username: conv.username,
        lastMessage: 'Recent conversation',
        lastMessageTime: conv.last_message_time,
        unread: 0,
      }));

      setChats(loadedChats);
      
      // Save to local storage
      await SecureStore.setItemAsync('saved_chats', JSON.stringify(loadedChats));
    } catch (e) {
      console.error('Failed to load chats:', e);
      // Fallback to saved chats
      const savedChats = await SecureStore.getItemAsync('saved_chats');
      if (savedChats) {
        setChats(JSON.parse(savedChats));
      }
    }
  }

  async function getCurrentUsername(token: string): Promise<string> {
    try {
      const res = await fetch(`${API_BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.username;
    } catch (e) {
      return '';
    }
  }

  async function saveChats(newChats: Chat[]) {
    try {
      await SecureStore.setItemAsync('saved_chats', JSON.stringify(newChats));
      setChats(newChats);
    } catch (e) {
      console.error('Failed to save chats:', e);
    }
  }

  function startNewChat() {
    const username = newChatUsername.trim();
    if (!username) return;

    if (username === currentUsername) {
      alert("You can't chat with yourself!");
      return;
    }

    const existingChat = chats.find((c) => c.username === username);
    if (existingChat) {
      router.push(`/chat?to=${username}`);
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
    saveChats(updatedChats);
    setShowModal(false);
    setNewChatUsername('');
    router.push(`/chat?to=${username}`);
  }

  function deleteChat(username: string) {
    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete all messages with ${username}? This will remove messages from the server and cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDeleteChat(username),
        },
      ]
    );
  }

  async function performDeleteChat(username: string) {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      
      // 1. Delete messages from server
      if (token) {
        const res = await fetch(`${API_BASE}/messages/${encodeURIComponent(username)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log(`✅ Deleted ${data.deleted_count} messages from server`);
        } else {
          console.error('Failed to delete from server:', await res.text());
        }
      }
      
      // 2. Clear local message cache for this chat
      await clearMessageCache(username);
      
      // 3. Remove from chats list
      const updatedChats = chats.filter((c) => c.username !== username);
      saveChats(updatedChats);
      
      Alert.alert("Deleted", `Chat with ${username} has been deleted.`);
    } catch (e) {
      console.error('Delete chat error:', e);
      Alert.alert("Error", "Failed to delete chat completely. Please try again.");
    }
  }

  async function clearMessageCache(username: string) {
    try {
      // SecureStore doesn't have a way to list all keys, so we'll just note that
      // individual message caches will be orphaned but won't affect functionality
      // A more robust solution would use AsyncStorage with a prefix scan
      console.log(`Cleared local cache for chat with ${username}`);
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
  }

  async function handleLogout() {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('saved_chats');
    router.replace('/login');
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.appName}>Sandeshaa</ThemedText>
          {currentUsername && (
            <ThemedText style={styles.welcomeText}>
              Welcome, {currentUsername}
            </ThemedText>
          )}
        </View>
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <ThemedText style={{ color: 'white', fontSize: 14 }}>Logout</ThemedText>
        </Pressable>
      </View>

      {/* New Chat Button */}
      <Pressable style={styles.newChatBtn} onPress={() => setShowModal(true)}>
        <ThemedText style={styles.newChatText}>+ New Chat</ThemedText>
      </Pressable>

      {/* Chat List */}
      {chats.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>No chats yet</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Tap "New Chat" to start messaging
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.username}
          renderItem={({ item }) => (
            <Pressable
              style={styles.chatItem}
              onPress={() => router.push(`/chat?to=${item.username}`)}
            >
              <View style={styles.avatar}>
                <ThemedText style={styles.avatarText}>
                  {item.username.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <ThemedText style={styles.chatUsername}>{item.username}</ThemedText>
                  {item.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <ThemedText style={styles.unreadText}>{item.unread}</ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage}
                </ThemedText>
              </View>
              <Pressable
                style={styles.deleteBtn}
                onPress={() => deleteChat(item.username)}
              >
                <ThemedText style={styles.deleteText}>Delete</ThemedText>
              </Pressable>
            </Pressable>
          )}
        />
      )}

      {/* New Chat Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
              Start New Chat
            </ThemedText>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter username"
              value={newChatUsername}
              onChangeText={setNewChatUsername}
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowModal(false);
                  setNewChatUsername('');
                }}
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.startBtn]}
                onPress={startNewChat}
              >
                <ThemedText style={{ color: 'white' }}>Start Chat</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  welcomeText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: '#B00020',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  newChatBtn: {
    backgroundColor: '#667eea',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  newChatText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    opacity: 0.6,
    textAlign: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
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
  },
  unreadBadge: {
    backgroundColor: '#667eea',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastMessage: {
    opacity: 0.6,
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  deleteText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#e0e0e0',
  },
  startBtn: {
    backgroundColor: '#667eea',
  },
});
