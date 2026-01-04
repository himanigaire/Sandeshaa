
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, Alert, ActivityIndicator, LogBox } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Paths } from "expo-file-system";
import * as FileSystem from "expo-file-system";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { decryptFromSender, encryptForRecipient, encryptFileForRecipient, decryptFileFromSender } from "../src/crypto";
import { uploadFile, downloadFile } from "../src/api";

// Ignore specific warnings that we handle gracefully
LogBox.ignoreLogs([
  'Failed to fetch messages',
  'User not found',
  'Could not decrypt message',
]);

/* 🔧 CHANGE IP TO YOUR MAC IP */
const API_BASE = "http://192.168.1.65:8000";
const WS_BASE = "ws://192.168.1.65:8000/ws";

/* ---------- Types ---------- */

type ServerMessage = {
  id: number;
  from_user_id: number;
  to_user_id: number;
  ciphertext: string;
  created_at: string | null;
};

type UiMessage = {
  id: string;
  client_id?: string;
  who: "me" | "other";
  text: string;
  created_at?: string | null;
  status?: "sending" | "sent" | "delivered";
  isFile?: boolean;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
};

export default function ChatScreen() {
  const router = useRouter();
  const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(null);
  const { to } = useLocalSearchParams<{ to?: string }>();
  const otherUsername = String(to ?? "");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    size: number;
  } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  /* ---------- FETCH RECIPIENT PUBLIC KEY ---------- */
  async function fetchRecipientKey() {
    try {
      if (!otherUsername) return;

      const res = await fetch(
        `${API_BASE}/users/${encodeURIComponent(otherUsername)}/keys`
      );

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 404 || errorText.includes('User not found')) {
          Alert.alert(
            "User Not Found",
            `The username "${otherUsername}" is not registered. Please check the username and try again.`,
            [
              {
                text: "OK",
                onPress: () => {
                  setStatus("idle"); // Clear error state
                  router.back();
                },
              },
            ]
          );
          return;
        }
        throw new Error(errorText);
      }

      const data = await res.json();
      setRecipientPublicKey(data.identity_public_key);

      console.log(
        "🔑 Recipient public key loaded:",
        data.identity_public_key.slice(0, 30) + "..."
      );
    } catch (e) {
      console.error("❌ FAILED TO FETCH RECIPIENT KEY:", e);
    }
  }

  /* ---------- FETCH MESSAGE HISTORY ---------- */
  async function fetchMessages() {
    try {
      setStatus("loading");

      const token = await SecureStore.getItemAsync("access_token");
      if (!token || !otherUsername) {
        setStatus("idle");
        return;
      }

      const res = await fetch(
        `${API_BASE}/messages/${encodeURIComponent(otherUsername)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to fetch messages:", errorText);
        setStatus("idle"); // Clear error state
        return;
      }

      const data: ServerMessage[] = await res.json();
      const myId = parseJwtSub(token);

      // Decrypt all messages
      const ui: UiMessage[] = await Promise.all(
        data.map(async (m) => {
          let plaintext = m.ciphertext;
          const isSentByMe = myId && m.from_user_id === myId;
          
          // Check if message looks like it needs decryption
          const looksEncrypted = m.ciphertext.startsWith('{') || 
                                 m.ciphertext.length > 100 || 
                                 /^[A-Za-z0-9+/=]+$/.test(m.ciphertext.substring(0, 50));
          
          if (looksEncrypted && !isSentByMe) {
            // Only try to decrypt messages sent TO you, not BY you
            try {
              const decrypted = await decryptFromSender(m.ciphertext);
              plaintext = decrypted;
              console.log(`✅ Message ${m.id} decrypted:`, plaintext.substring(0, 30) + '...');
            } catch (e: any) {
              console.error(`❌ Message ${m.id} decrypt failed:`, e.message);
              console.log(`Raw ciphertext (first 100 chars):`, m.ciphertext.substring(0, 100));
              // If decryption fails, show a placeholder instead of encrypted gibberish
              plaintext = "[Encrypted message - could not decrypt]";
            }
          } else if (isSentByMe && looksEncrypted) {
            // Messages you sent are encrypted for the recipient - retrieve from cache
            const cached = await getCachedMessagePlaintext(String(m.id));
            if (cached) {
              plaintext = cached;
              console.log(`📦 Message ${m.id} retrieved from cache:`, plaintext.substring(0, 30) + '...');
            } else {
              plaintext = "[Message sent from another device]";
              console.log(`ℹ️ Message ${m.id} sent by you but not in cache`);
            }
          } else {
            console.log(`ℹ️ Message ${m.id} is plaintext`);
          }

          return {
            id: String(m.id),
            who: isSentByMe ? "me" : "other",
            text: plaintext,
            created_at: m.created_at,
            status: "delivered",
          };
        })
      );

      setMessages(ui);
      setStatus("idle");
      
      // Update chats list with this conversation
      if (ui.length > 0) {
        await updateChatsList(otherUsername, ui[0].text, ui[0].created_at);
      }
    } catch (e) {
      console.error("❌ FETCH ERROR:", e);
      setStatus("idle"); // Clear error state, don't show to user
    }
  }

  /* ---------- MESSAGE CACHE (for sent messages) ---------- */
  async function cacheMessagePlaintext(messageId: string, plaintext: string) {
    try {
      const key = `msg_cache_${otherUsername}_${messageId}`;
      await SecureStore.setItemAsync(key, plaintext);
    } catch (e) {
      console.error("Failed to cache message:", e);
    }
  }

  async function getCachedMessagePlaintext(messageId: string): Promise<string | null> {
    try {
      const key = `msg_cache_${otherUsername}_${messageId}`;
      const cached = await SecureStore.getItemAsync(key);
      if (cached) {
        console.log(`📦 Found cached message for key: ${key}`);
        return cached;
      }
      console.log(`❌ No cached message for key: ${key}`);
      return null;
    } catch (e) {
      console.error("Failed to get cached message:", e);
      return null;
    }
  }

  /* ---------- UPDATE CHATS LIST ---------- */
  async function updateChatsList(username: string, lastMessage: string, lastMessageTime?: string | null) {
    try {
      const savedChats = await SecureStore.getItemAsync('saved_chats');
      let chats = savedChats ? JSON.parse(savedChats) : [];
      
      // Check if chat exists
      const existingIndex = chats.findIndex((c: any) => c.username === username);
      
      if (existingIndex >= 0) {
        // Update existing chat
        chats[existingIndex] = {
          ...chats[existingIndex],
          lastMessage,
          lastMessageTime,
        };
      } else {
        // Add new chat
        chats.unshift({
          username,
          lastMessage,
          lastMessageTime,
          unread: 0,
        });
      }
      
      await SecureStore.setItemAsync('saved_chats', JSON.stringify(chats));
    } catch (e) {
      console.error('Failed to update chats list:', e);
    }
  }

  /* ---------- WEBSOCKET ---------- */
  useEffect(() => {
    let closedByUs = false;

    async function connectWs() {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token || !otherUsername) return;

      const ws = new WebSocket(`${WS_BASE}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => console.log("WS CONNECTED ✅");

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        // Incoming message
        if (data.type === "message") {
          let plaintext = data.ciphertext;

          try {
            plaintext = await decryptFromSender(data.ciphertext);
            console.log("✅ Real-time message decrypted successfully");
          } catch (e: any) {
            console.error("❌ Real-time decrypt failed:", e.message);
            plaintext = "[Encrypted message - could not decrypt]";
          }

          setMessages((prev) => [
            {
              id: String(data.id),
              who: "other",
              text: plaintext,
              created_at: data.created_at,
              status: "delivered",
            },
            ...prev,
          ]);
          return;
        }

        // Incoming file message
        if (data.type === "file_message") {
          console.log("📎 Received file:", data);
          
          setMessages((prev) => [
            {
              id: String(data.id),
              who: "other",
              text: `📎 ${data.filename}`,
              isFile: true,
              fileId: data.file_id,
              fileName: data.filename,
              fileSize: data.file_size,
              created_at: data.created_at,
              status: "delivered",
            },
            ...prev,
          ]);
          return;
        }

        // ACK for sent message
        if (data.type === "sent") {
          // Update cache with real server message ID
          setMessages((prev) => {
            const sentMessage = prev.find(m => m.client_id === data.client_id);
            if (sentMessage && sentMessage.text) {
              cacheMessagePlaintext(String(data.id), sentMessage.text).then(() => {
                console.log(`📦 Cached sent message ${data.id} (was client_id: ${data.client_id})`);
              });
            }
            
            return prev.map((m) =>
              m.client_id === data.client_id
                ? {
                    ...m,
                    id: String(data.id),
                    status: data.delivered ? "delivered" : "sent",
                  }
                : m
            );
          });
          return;
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!closedByUs) setTimeout(connectWs, 1500);
      };
    }

    connectWs();
    return () => {
      closedByUs = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [otherUsername]);

  /* ---------- SEND MESSAGE ---------- */
  async function sendMessage() {
    const text = message.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== 1) return;

    if (!recipientPublicKey) {
      console.log("❌ Recipient key not loaded yet");
      return;
    }

    const client_id = String(Date.now());

    // Show message immediately (optimistic UI)
    setMessages((prev) => [
      {
        id: client_id,
        client_id,
        who: "me",
        text,
        created_at: new Date().toISOString(),
        status: "sending",
      },
      ...prev,
    ]);

    try {
      // Encrypt the message
      const encrypted = await encryptForRecipient(text, recipientPublicKey);

      console.log("🔒 Message encrypted, sending...");

      // Send encrypted message
      wsRef.current.send(
        JSON.stringify({
          type: "send_message",
          to: otherUsername,
          ciphertext: encrypted,
          client_id,
        })
      );
      
      // Cache the plaintext for later retrieval (using client_id temporarily)
      await cacheMessagePlaintext(client_id, text);
      console.log(`📝 Cached message with client_id: ${client_id}, text: "${text}"`);

      setMessage("");
    } catch (e) {
      console.error("❌ Encryption failed:", e);
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((m) => m.client_id !== client_id));
    }
  }

  /* ---------- FILE PICKER ---------- */
  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      
      // Check file size (10MB limit)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size && file.size > MAX_SIZE) {
        Alert.alert("File Too Large", "Maximum file size is 10MB");
        return;
      }

      setSelectedFile({
        uri: file.uri,
        name: file.name,
        size: file.size || 0,
      });
    } catch (e) {
      console.error("Error picking file:", e);
      Alert.alert("Error", "Failed to pick file");
    }
  }

  /* ---------- SEND FILE ---------- */
  async function sendFile() {
    if (!selectedFile || !recipientPublicKey) return;

    setUploadingFile(true);

    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) throw new Error("No token");

      // Read file as base64
      const fileData = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: 'base64',
      });

      // Convert base64 to Uint8Array
      const binaryString = atob(fileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Encrypt file
      console.log("🔒 Encrypting file...");
      const encryptedPayload = await encryptFileForRecipient(bytes, recipientPublicKey);

      // Create a temporary file with encrypted content
      const tempUri = Paths.cache + '/' + selectedFile.name + '.enc';
      await FileSystem.writeAsStringAsync(tempUri, encryptedPayload, {
        encoding: 'utf8',
      });

      // Upload encrypted file
      console.log("📤 Uploading file...");
      const result = await uploadFile(tempUri, selectedFile.name, otherUsername, token);

      console.log("✅ File uploaded:", result);

      // Add file message to chat
      setMessages((prev) => [
        {
          id: String(result.file_id),
          who: "me",
          text: `📎 ${selectedFile.name}`,
          isFile: true,
          fileId: result.file_id,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          created_at: new Date().toISOString(),
          status: "delivered",
        },
        ...prev,
      ]);

      // Clean up
      await FileSystem.deleteAsync(tempUri, { idempotent: true });
      setSelectedFile(null);
      Alert.alert("Success", "File sent successfully!");
    } catch (e) {
      console.error("❌ File upload error:", e);
      Alert.alert("Error", "Failed to send file");
    } finally {
      setUploadingFile(false);
    }
  }

  /* ---------- DOWNLOAD FILE ---------- */
  async function downloadFileHandler(fileId: string, fileName: string) {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) throw new Error("No token");

      console.log("📥 Downloading file...");
      const blob = await downloadFile(fileId, token);

      // Convert blob to ArrayBuffer then to Uint8Array
      const arrayBuffer = await blob.arrayBuffer();
      const encryptedBytes = new Uint8Array(arrayBuffer);

      // Convert encrypted bytes to string (assuming it's JSON from server)
      const encryptedText = new TextDecoder().decode(encryptedBytes);

      // Decrypt file
      console.log("🔓 Decrypting file...");
      const decryptedBytes = await decryptFileFromSender(encryptedText);

      // Convert to base64
      let binary = '';
      for (let i = 0; i < decryptedBytes.length; i++) {
        binary += String.fromCharCode(decryptedBytes[i]);
      }
      const decryptedBase64 = btoa(binary);

      // Save to downloads
      const downloadUri = Paths.document + '/' + fileName;
      await FileSystem.writeAsStringAsync(downloadUri, decryptedBase64, {
        encoding: 'base64',
      });

      Alert.alert("Success", `File saved to: ${downloadUri}`);
      console.log("✅ File downloaded:", downloadUri);
    } catch (e) {
      console.error("❌ Download error:", e);
      Alert.alert("Error", "Failed to download file");
    }
  }

  useEffect(() => {
    fetchMessages();
    fetchRecipientKey();
  }, [otherUsername]);

  /* ---------- UI ---------- */
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          {otherUsername}
        </ThemedText>
      </ThemedView>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(i) => i.id}
        inverted
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item }) => (
          <ThemedView
            style={[
              styles.bubble,
              item.who === "me" ? styles.me : styles.other,
            ]}
          >
            {item.isFile ? (
              <ThemedView style={styles.fileMessage}>
                <ThemedText style={styles.fileIcon}>📎</ThemedText>
                <ThemedView style={styles.fileInfo}>
                  <ThemedText style={styles.fileName}>{item.fileName}</ThemedText>
                  <ThemedText style={styles.fileSize}>
                    {item.fileSize ? (item.fileSize / 1024).toFixed(1) + ' KB' : ''}
                  </ThemedText>
                </ThemedView>
                {item.who === "other" && (
                  <Pressable
                    style={styles.downloadBtn}
                    onPress={() => downloadFileHandler(item.fileId!, item.fileName!)}
                  >
                    <ThemedText style={styles.downloadText}>⬇️</ThemedText>
                  </Pressable>
                )}
              </ThemedView>
            ) : (
              <ThemedText style={[
                styles.messageText,
                item.who === "me" ? { color: 'white' } : { color: 'black' }
              ]}>
                {item.text}
              </ThemedText>
            )}

            {item.who === "me" && (
              <ThemedText style={styles.timeText}>
                {item.status === "sending"
                  ? "Sending…"
                  : item.status === "sent"
                  ? "Sent"
                  : item.status === "delivered"
                  ? "Delivered ✓"
                  : ""}
                {item.created_at ? ` · ${formatTime(item.created_at)}` : ""}
              </ThemedText>
            )}
          </ThemedView>
        )}
      />

      {/* Selected File Preview */}
      {selectedFile && (
        <ThemedView style={styles.filePreview}>
          <ThemedText style={styles.filePreviewText}>
            📎 {selectedFile.name}
          </ThemedText>
          <Pressable onPress={() => setSelectedFile(null)}>
            <ThemedText style={styles.removeFileBtn}>×</ThemedText>
          </Pressable>
        </ThemedView>
      )}

      {/* Input Area */}
      <ThemedView style={styles.inputRow}>
        <Pressable style={styles.attachBtn} onPress={pickFile} disabled={uploadingFile}>
          <ThemedText style={styles.attachText}>📎</ThemedText>
        </Pressable>
        
        {selectedFile ? (
          <Pressable 
            style={[styles.sendBtn, styles.sendFileBtn]} 
            onPress={sendFile}
            disabled={uploadingFile}
          >
            {uploadingFile ? (
              <ActivityIndicator color="white" />
            ) : (
              <ThemedText style={{ color: "white" }}>Send File</ThemedText>
            )}
          </Pressable>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Type message…"
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
            />
            <Pressable style={styles.sendBtn} onPress={sendMessage}>
              <ThemedText style={{ color: "white" }}>Send</ThemedText>
            </Pressable>
          </>
        )}
      </ThemedView>
    </ThemedView>
  );
}

/* ---------- Helpers ---------- */
function parseJwtSub(token: string): number | null {
  try {
    const payload = JSON.parse(
      globalThis.atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return parseInt(payload.sub, 10);
  } catch {
    return null;
  }
}

function formatTime(iso?: string | null) {
  if (!iso) return "";

  const date = new Date(iso);
  const now = new Date();

  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    maxWidth: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  me: { 
    alignSelf: "flex-end",
    backgroundColor: '#667eea',
  },
  other: { 
    alignSelf: "flex-start",
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000000', // Ensure text is visible
  },
  fileMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileIcon: {
    fontSize: 24,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  downloadBtn: {
    padding: 8,
  },
  downloadText: {
    fontSize: 20,
  },
  timeText: { 
    fontSize: 11, 
    opacity: 0.7, 
    marginTop: 6,
    color: 'white',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  filePreviewText: {
    fontSize: 14,
    flex: 1,
  },
  removeFileBtn: {
    fontSize: 28,
    color: '#B00020',
    paddingHorizontal: 10,
  },
  inputRow: { 
    flexDirection: "row", 
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  attachBtn: {
    backgroundColor: '#f0f0f0',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachText: {
    fontSize: 24,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  sendBtn: {
    backgroundColor: "#667eea",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    justifyContent: "center",
    minWidth: 70,
    alignItems: 'center',
  },
  sendFileBtn: {
    flex: 1,
    paddingVertical: 12,
  },
});

