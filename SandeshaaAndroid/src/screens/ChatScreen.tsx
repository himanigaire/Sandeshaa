// src/screens/ChatScreen.tsx
// Sandeshaa Android – Individual Chat Screen
// Replaces: expo-document-picker → react-native-document-picker
// Replaces: expo-file-system → react-native-fs
// Replaces: expo-secure-store → src/storage.ts

import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';

import {RootStackParamList} from '../navigation/AppNavigator';
import {
  decryptFromSender,
  encryptForRecipient,
  encryptFileForRecipient,
  decryptFileFromSender,
} from '../crypto';
import {uploadFile, downloadFile} from '../api';
import {API_BASE_URL as API_BASE, WS_BASE_URL as WS_BASE} from '../config';
import {
  getToken,
  cacheMessagePlaintext,
  getCachedMessagePlaintext,
} from '../storage';

// ---- Types ----
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

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
  who: 'me' | 'other';
  text: string;
  created_at?: string | null;
  status?: 'sending' | 'sent' | 'delivered';
  isFile?: boolean;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
};

export default function ChatScreen({route}: Props) {
  const otherUsername = route.params.to;

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [recipientPublicKey, setRecipientPublicKey] = useState<string | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    size: number;
  } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const wsRef = useRef<WebSocket | null>(null);

  // ---- FETCH RECIPIENT PUBLIC KEY ----
  async function fetchRecipientKey() {
    try {
      if (!otherUsername) {
        return;
      }

      const res = await fetch(
        `${API_BASE}/users/${encodeURIComponent(otherUsername)}/keys`,
      );

      if (!res.ok) {
        if (res.status === 404) {
          Alert.alert(
            'User Not Found',
            `The username "${otherUsername}" is not registered.`,
          );
          return;
        }
        throw new Error(await res.text());
      }

      const data = await res.json();
      setRecipientPublicKey(data.identity_public_key);
      console.log('🔑 Recipient public key loaded');
    } catch (e) {
      console.error('❌ FAILED TO FETCH RECIPIENT KEY:', e);
    }
  }

  // ---- FETCH MESSAGE HISTORY ----
  async function fetchMessages() {
    try {
      setStatus('loading');

      const token = await getToken();
      if (!token || !otherUsername) {
        setStatus('idle');
        return;
      }

      const [textRes, fileRes] = await Promise.all([
        fetch(`${API_BASE}/messages/${encodeURIComponent(otherUsername)}`, {
          headers: {Authorization: `Bearer ${token}`},
        }),
        fetch(
          `${API_BASE}/file-messages/${encodeURIComponent(otherUsername)}`,
          {
            headers: {Authorization: `Bearer ${token}`},
          },
        ),
      ]);

      if (!textRes.ok) {
        console.error('Failed to fetch messages:', await textRes.text());
        setStatus('idle');
        return;
      }

      const data: ServerMessage[] = await textRes.json();
      const myId = parseJwtSub(token);

      // Decrypt text messages
      const textMessages: UiMessage[] = await Promise.all(
        data.map(async m => {
          let plaintext = m.ciphertext;
          const isSentByMe = myId !== null && m.from_user_id === myId;

          const looksEncrypted =
            m.ciphertext.startsWith('{') ||
            m.ciphertext.length > 100 ||
            /^[A-Za-z0-9+/=]+$/.test(m.ciphertext.substring(0, 50));

          if (looksEncrypted && !isSentByMe) {
            try {
              plaintext = await decryptFromSender(m.ciphertext);
            } catch {
              plaintext = '[Encrypted message - could not decrypt]';
            }
          } else if (isSentByMe && looksEncrypted) {
            const cached = await getCachedMessagePlaintext(
              otherUsername,
              String(m.id),
            );
            if (cached) {
              plaintext = cached;
            } else {
              plaintext = '[Message sent from another device]';
            }
          }

          return {
            id: `msg_${m.id}`,
            who: isSentByMe ? ('me' as const) : ('other' as const),
            text: plaintext,
            created_at: m.created_at,
            status: 'delivered' as const,
          };
        }),
      );

      // Process file messages
      let fileMessages: UiMessage[] = [];
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        fileMessages = fileData.map((f: any) => ({
          id: `file_${f.id}`,
          who:
            myId && f.from_user_id === myId
              ? ('me' as const)
              : ('other' as const),
          text: `📎 ${f.filename}`,
          isFile: true,
          fileId: String(f.id),
          fileName: f.filename,
          fileSize: f.file_size,
          created_at: f.created_at,
          status: 'delivered' as const,
        }));
      }

      // Merge and sort
      const allMessages = [...textMessages, ...fileMessages].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setMessages(allMessages);
      setStatus('idle');
    } catch (e) {
      console.error('❌ FETCH ERROR:', e);
      setStatus('idle');
    }
  }

  // ---- WEBSOCKET ----
  useEffect(() => {
    let closedByUs = false;

    async function connectWs() {
      const token = await getToken();
      if (!token || !otherUsername) {
        return;
      }

      const ws = new WebSocket(
        `${WS_BASE}?token=${encodeURIComponent(token)}`,
      );
      wsRef.current = ws;

      ws.onopen = () => console.log('WS CONNECTED ✅');

      ws.onmessage = async event => {
        const data = JSON.parse(event.data);

        if (data.type === 'message') {
          let plaintext = data.ciphertext;
          try {
            plaintext = await decryptFromSender(data.ciphertext);
          } catch {
            plaintext = '[Encrypted message - could not decrypt]';
          }

          setMessages(prev => [
            {
              id: `msg_${data.id}`,
              who: 'other',
              text: plaintext,
              created_at: data.created_at,
              status: 'delivered',
            },
            ...prev,
          ]);
          return;
        }

        if (data.type === 'file_message') {
          setMessages(prev => [
            {
              id: `file_${data.id}`,
              who: 'other',
              text: `📎 ${data.filename}`,
              isFile: true,
              fileId: String(data.id),
              fileName: data.filename,
              fileSize: data.file_size,
              created_at: data.created_at,
              status: 'delivered',
            },
            ...prev,
          ]);
          return;
        }

        if (data.type === 'sent') {
          setMessages(prev => {
            const sentMessage = prev.find(
              m => m.client_id === data.client_id,
            );
            if (sentMessage?.text) {
              cacheMessagePlaintext(
                otherUsername,
                String(data.id),
                sentMessage.text,
              );
            }

            return prev.map(m =>
              m.client_id === data.client_id
                ? {
                    ...m,
                    id: `msg_${data.id}`,
                    status: data.delivered
                      ? ('delivered' as const)
                      : ('sent' as const),
                  }
                : m,
            );
          });
          return;
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!closedByUs) {
          setTimeout(connectWs, 2000);
        }
      };

      ws.onerror = err => {
        console.error('WS Error:', err);
      };
    }

    connectWs();
    return () => {
      closedByUs = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [otherUsername]);

  // ---- SEND MESSAGE ----
  async function sendMessage() {
    const text = message.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== 1) {
      return;
    }

    if (!recipientPublicKey) {
      Alert.alert('Error', 'Recipient key not loaded yet');
      return;
    }

    const client_id = String(Date.now());

    setMessages(prev => [
      {
        id: client_id,
        client_id,
        who: 'me',
        text,
        created_at: new Date().toISOString(),
        status: 'sending',
      },
      ...prev,
    ]);

    try {
      const encrypted = await encryptForRecipient(text, recipientPublicKey);

      wsRef.current.send(
        JSON.stringify({
          type: 'send_message',
          to: otherUsername,
          ciphertext: encrypted,
          client_id,
        }),
      );

      await cacheMessagePlaintext(otherUsername, client_id, text);
      setMessage('');
    } catch (e) {
      console.error('❌ Encryption failed:', e);
      setMessages(prev => prev.filter(m => m.client_id !== client_id));
      Alert.alert('Error', 'Failed to encrypt message');
    }
  }

  // ---- FILE PICKER ----
  async function pickFile() {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const file = result[0];
      const MAX_SIZE = 10 * 1024 * 1024;

      if (file.size && file.size > MAX_SIZE) {
        Alert.alert('File Too Large', 'Maximum file size is 10MB');
        return;
      }

      setSelectedFile({
        uri: file.fileCopyUri || file.uri,
        name: file.name || 'unknown_file',
        size: file.size || 0,
      });
    } catch (e) {
      if (DocumentPicker.isCancel(e)) {
        return; // User cancelled
      }
      console.error('Error picking file:', e);
      Alert.alert('Error', 'Failed to pick file');
    }
  }

  // ---- SEND FILE ----
  async function sendFile() {
    if (!selectedFile || !recipientPublicKey) {
      return;
    }

    setUploadingFile(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No token');
      }

      // Read file as base64, convert to bytes
      const fileBase64 = await RNFS.readFile(selectedFile.uri, 'base64');
      const binaryString = atob(fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('🔒 Encrypting file...');
      const encryptedPayload = await encryptFileForRecipient(
        bytes,
        recipientPublicKey,
      );

      // Write encrypted content to temp file
      const tempPath =
        RNFS.CachesDirectoryPath + '/' + selectedFile.name + '.enc';
      await RNFS.writeFile(tempPath, encryptedPayload, 'utf8');

      console.log('📤 Uploading file...');
      const result = await uploadFile(
        'file://' + tempPath,
        selectedFile.name,
        otherUsername,
        token,
      );

      console.log('✅ File uploaded:', result);

      setMessages(prev => [
        {
          id: `file_${result.file_id}`,
          who: 'me',
          text: `📎 ${selectedFile.name}`,
          isFile: true,
          fileId: String(result.file_id),
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          created_at: new Date().toISOString(),
          status: 'delivered',
        },
        ...prev,
      ]);

      // Cleanup temp file
      await RNFS.unlink(tempPath).catch(() => {});
      setSelectedFile(null);
      Alert.alert('Success', 'File sent successfully!');
    } catch (e) {
      console.error('❌ File upload error:', e);
      Alert.alert('Error', 'Failed to send file');
    } finally {
      setUploadingFile(false);
    }
  }

  // ---- DOWNLOAD FILE ----
  async function downloadFileHandler(fileId: string, fileName: string) {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No token');
      }

      console.log('📥 Downloading file...');
      const encryptedText = await downloadFile(fileId, token);

      console.log('🔓 Decrypting file...');
      const decryptedBytes = await decryptFileFromSender(encryptedText);

      // Convert to base64 for saving
      let binary = '';
      for (let i = 0; i < decryptedBytes.length; i++) {
        binary += String.fromCharCode(decryptedBytes[i]);
      }
      const decryptedBase64 = btoa(binary);

      const downloadPath = RNFS.DownloadDirectoryPath + '/' + fileName;
      await RNFS.writeFile(downloadPath, decryptedBase64, 'base64');

      Alert.alert('Success', `File saved to Downloads/${fileName}`);
      console.log('✅ File downloaded:', downloadPath);
    } catch (e) {
      console.error('❌ Download error:', e);
      Alert.alert('Error', 'Failed to download file');
    }
  }

  // ---- Init ----
  useEffect(() => {
    fetchMessages();
    fetchRecipientKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUsername]);

  // ---- RENDER ----
  const renderMessage = ({item}: {item: UiMessage}) => (
    <View
      style={[styles.bubble, item.who === 'me' ? styles.me : styles.other]}>
      {item.isFile ? (
        <View style={styles.fileMessage}>
          <Text style={styles.fileIcon}>📎</Text>
          <View style={styles.fileInfo}>
            <Text
              style={[
                styles.fileName,
                {color: item.who === 'me' ? '#fff' : '#333'},
              ]}>
              {item.fileName}
            </Text>
            <Text
              style={[
                styles.fileSize,
                {color: item.who === 'me' ? 'rgba(255,255,255,0.7)' : '#888'},
              ]}>
              {item.fileSize
                ? (item.fileSize / 1024).toFixed(1) + ' KB'
                : ''}
            </Text>
          </View>
          {item.who === 'other' && (
            <Pressable
              style={styles.downloadBtn}
              onPress={() =>
                downloadFileHandler(item.fileId!, item.fileName!)
              }>
              <Text style={styles.downloadText}>⬇️</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Text
          style={[
            styles.messageText,
            {color: item.who === 'me' ? '#fff' : '#333'},
          ]}>
          {item.text}
        </Text>
      )}

      {item.who === 'me' && (
        <Text style={styles.timeText}>
          {item.status === 'sending'
            ? 'Sending…'
            : item.status === 'sent'
              ? 'Sent'
              : item.status === 'delivered'
                ? 'Delivered ✓'
                : ''}
          {item.created_at ? ` · ${formatTime(item.created_at)}` : ''}
        </Text>
      )}
      {item.who === 'other' && item.created_at && (
        <Text style={styles.timeTextOther}>{formatTime(item.created_at)}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Loading indicator */}
      {status === 'loading' && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color="#667eea" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      )}

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={i => i.id}
        inverted
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
      />

      {/* Selected File Preview */}
      {selectedFile && (
        <View style={styles.filePreview}>
          <Text style={styles.filePreviewText} numberOfLines={1}>
            📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </Text>
          <Pressable onPress={() => setSelectedFile(null)}>
            <Text style={styles.removeFileBtn}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputRow}>
        <Pressable
          style={styles.attachBtn}
          onPress={pickFile}
          disabled={uploadingFile}>
          <Text style={styles.attachText}>📎</Text>
        </Pressable>

        {selectedFile ? (
          <Pressable
            style={[styles.sendBtn, styles.sendFileBtn]}
            onPress={sendFile}
            disabled={uploadingFile}>
            {uploadingFile ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendText}>Send File</Text>
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
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <Pressable
              style={[
                styles.sendBtn,
                !message.trim() && styles.sendBtnDisabled,
              ]}
              onPress={sendMessage}
              disabled={!message.trim()}>
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

// ---- Helpers ----
function parseJwtSub(token: string): number | null {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    return parseInt(payload.sub, 10);
  } catch {
    return null;
  }
}

function formatTime(iso?: string | null) {
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---- Styles ----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#888',
  },
  messagesList: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bubble: {
    padding: 12,
    borderRadius: 16,
    marginVertical: 3,
    maxWidth: '78%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  me: {
    alignSelf: 'flex-end',
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  other: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
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
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  timeTextOther: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 6,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#e8e8ff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  filePreviewText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  removeFileBtn: {
    fontSize: 20,
    color: '#B00020',
    paddingHorizontal: 8,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
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
    fontSize: 22,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  sendBtn: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendFileBtn: {
    flex: 1,
  },
  sendText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
