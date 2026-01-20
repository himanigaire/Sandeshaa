// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import { registerUser, loginUser, getUserKeys, filesAPI, getMessagesWithUser, getFileMessagesWithUser, getCurrentUser } from "./api";
import {
  getOrCreateIdentityKeys,
  computeSharedSecret,
  encryptMessage,
  decryptMessage,
  encryptFile,
  decryptFile,
} from "./crypto";
import FileUpload from "./components/FileUpload";

// Toast notification helper
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '✕'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function App() {
  // Auth / identity state
  const [identityKeys, setIdentityKeys] = useState(null);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(true);
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState(null);

  // WebSocket & chat state
  const [ws, setWs] = useState(null);
  const [wsStatus, setWsStatus] = useState("Disconnected");

  // Chat list management
  const [chats, setChats] = useState({});
  const [activeChat, setActiveChat] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const userKeyCache = useRef({});
  const messagesEndRef = useRef(null);

  // Load identity keys and saved chats on mount
  useEffect(() => {
    const keys = getOrCreateIdentityKeys();
    setIdentityKeys(keys);
    console.log("Identity keys loaded/generated:", keys);
  }, []);

  // Load saved chats from localStorage when user logs in
  useEffect(() => {
    if (username) {
      const savedChats = localStorage.getItem(`chats_${username}`);
      if (savedChats) {
        try {
          setChats(JSON.parse(savedChats));
        } catch (err) {
          console.error("Failed to load saved chats:", err);
        }
      }
    }
  }, [username]);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (username && Object.keys(chats).length > 0) {
      localStorage.setItem(`chats_${username}`, JSON.stringify(chats));
    }
  }, [chats, username]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeChat]);

  async function fetchIdentityPublicKey(name) {
    if (userKeyCache.current[name]) {
      return userKeyCache.current[name];
    }
    const data = await getUserKeys(name);
    userKeyCache.current[name] = data.identity_public_key;
    return data.identity_public_key;
  }

  function connectWebSocket(tok) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }

    const socket = new WebSocket(`ws://127.0.0.1:8000/ws?token=${tok}`);
    socket.onopen = () => {
      console.log("WebSocket connected");
      setWsStatus("Connected");
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      setWsStatus("Disconnected");
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      setWsStatus("Error");
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "message") {
          const fromUser = data.from;
          console.log("Received message from", fromUser, data);

          if (!identityKeys) {
            console.warn("Identity keys not ready; cannot decrypt");
            return;
          }

          const otherPublicKey = await fetchIdentityPublicKey(fromUser);
          const sharedSecret = computeSharedSecret(
            otherPublicKey,
            identityKeys.privateKeyBase64
          );
          const plaintext = decryptMessage(data.ciphertext, sharedSecret);

          // Add message to chat
          addMessageToChat(fromUser, {
            id: data.id,
            from: fromUser,
            to: username,
            text: plaintext,
            direction: "incoming",
            created_at: data.created_at,
          });
        } else if (data.type === "file_message") {
          // ✅ ADD THIS: Handle incoming file notification
          const fromUser = data.from;
          console.log("Received file from", fromUser, data);
    
          addMessageToChat(fromUser, {
            id: data.id,
            from: fromUser,
            to: username,
            text: `📎 ${data.filename}`,
            isFile: true,
            fileId: data.file_id,
            fileName: data.filename,
            fileSize: data.file_size,
            direction: "incoming",
            created_at: data.created_at,
          });
        }
        else if (data.type === "sent") {
          console.log("Message acknowledged by server:", data);
        } else if (data.type === "error") {
          console.error("Server error:", data.message);
        }
      } catch (err) {
        console.error("Error handling WebSocket message:", err);
      }
    };

    setWs(socket);
  }

  // Logout function
  function logout() {
    // Close WebSocket
    if (ws) {
      ws.close();
    }
    // Clear all state
    setToken(null);
    setUsername(null);
    setWs(null);
    setWsStatus("Disconnected");
    setChats({});
    setActiveChat(null);
    userKeyCache.current = {};
    // Clear localStorage
    if (username) {
      localStorage.removeItem(`chats_${username}`);
    }
    showToast("Logged out successfully");
  }

  // Load chat history from database
  async function loadChatHistory() {
    if (!token) return;
    
    try {
      // Get current user info to get user ID
      const currentUser = await getCurrentUser(token);
      const currentUserId = currentUser.id;
      
      // Get list of users who have messages with current user
      // For now, we'll check known users - in a real app you'd have a contacts/conversations endpoint
      const knownUsers = ['muna', 'munu', 'sarthak']; // Add other usernames as needed
      
      for (const otherUser of knownUsers) {
        try {
          const messages = await getMessagesWithUser(otherUser, token);
          const fileMessages = await getFileMessagesWithUser(otherUser, token);
          
          const allMessages = [];
          
          if (messages && messages.length > 0) {
            // Convert regular database messages to chat format
            const chatMessages = messages.map(msg => ({
              id: `msg_${msg.id}`,
              from: msg.from_user_id === currentUserId ? username : otherUser,
              to: msg.to_user_id === currentUserId ? username : otherUser,
              text: msg.ciphertext, // Will be decrypted when displayed
              direction: msg.from_user_id === currentUserId ? "outgoing" : "incoming",
              created_at: msg.created_at,
            }));
            allMessages.push(...chatMessages);
          }
          
          if (fileMessages && fileMessages.length > 0) {
            // Convert file messages to chat format
            const chatFileMessages = fileMessages.map(msg => ({
              id: `file_${msg.id}`,
              from: msg.from_user_id === currentUserId ? username : otherUser,
              to: msg.to_user_id === currentUserId ? username : otherUser,
              text: `📎 ${msg.filename}`,
              isFile: true,
              fileId: msg.id,
              fileName: msg.filename,
              fileSize: msg.file_size,
              direction: msg.from_user_id === currentUserId ? "outgoing" : "incoming",
              created_at: msg.created_at,
            }));
            allMessages.push(...chatFileMessages);
          }
          
          if (allMessages.length > 0) {
            // Sort all messages by created_at
            allMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            
            // Add to chats state
            setChats(prevChats => ({
              ...prevChats,
              [otherUser]: {
                messages: allMessages,
                lastMessage: allMessages[allMessages.length - 1]?.text?.substring(0, 50) + "...",
                lastMessageTime: allMessages[allMessages.length - 1]?.created_at,
                unread: 0
              }
            }));
          }
        } catch (err) {
          // User not found or no messages - skip
          console.log(`No messages with ${otherUser}`);
        }
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    }
  }

  // Add message to a specific chat
  function addMessageToChat(chatUsername, message) {
    setChats((prevChats) => {
      const existingChat = prevChats[chatUsername] || {
        messages: [],
        unread: 0,
        lastMessage: "",
        lastMessageTime: null,
      };

      const newMessages = [...existingChat.messages, message];
      const isUnread =
        activeChat !== chatUsername && message.direction === "incoming";

      return {
        ...prevChats,
        [chatUsername]: {
          messages: newMessages,
          unread: isUnread ? existingChat.unread + 1 : existingChat.unread,
          lastMessage: message.text,
          lastMessageTime: message.created_at,
        },
      };
    });
  }

  // Delete a chat
  function deleteChat(chatUsername) {
    if (confirm(`Delete all messages with ${chatUsername}?`)) {
      setChats((prevChats) => {
        const newChats = { ...prevChats };
        delete newChats[chatUsername];
        return newChats;
      });
      if (activeChat === chatUsername) {
        setActiveChat(null);
      }
    }
  }

  // Start new chat
  function startNewChat() {
    const trimmed = newChatUsername.trim();
    if (!trimmed) return;

    if (trimmed === username) {
      showToast("You can't chat with yourself!", "error");
      return;
    }

    // Initialize chat if doesn't exist
    if (!chats[trimmed]) {
      setChats((prev) => ({
        ...prev,
        [trimmed]: {
          messages: [],
          unread: 0,
          lastMessage: "",
          lastMessageTime: null,
        },
      }));
    }

    setActiveChat(trimmed);
    setShowNewChatModal(false);
    setNewChatUsername("");
  }

  // Select a chat and mark as read
  function selectChat(chatUsername) {
    setActiveChat(chatUsername);

    // Mark as read
    setChats((prevChats) => ({
      ...prevChats,
      [chatUsername]: {
        ...prevChats[chatUsername],
        unread: 0,
      },
    }));
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!identityKeys) {
      showToast("Keys not ready yet, please wait", "error");
      return;
    }
    if (!authUsername || !authPassword) {
      showToast("Please enter username and password", "error");
      return;
    }

    try {
      await registerUser({
        username: authUsername,
        password: authPassword,
        identityPublicKey: identityKeys.publicKeyBase64,
        prekeyPublic: identityKeys.publicKeyBase64,
      });
      showToast("Registration successful! Now log in");
      setIsRegisterMode(false);
    } catch (err) {
      console.error(err);
      showToast("Registration failed (username might be taken)", "error");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!authUsername || !authPassword) {
      showToast("Please enter username and password", "error");
      return;
    }
    try {
      const data = await loginUser({
        username: authUsername,
        password: authPassword,
      });
      setToken(data.access_token);
      setUsername(authUsername);
      setAuthUsername(""); // Clear credentials
      setAuthPassword(""); // Clear credentials
      connectWebSocket(data.access_token);
      showToast("Login successful!");
      // Load chat history after successful login
      setTimeout(() => loadChatHistory(), 1000); // Wait for WebSocket to connect
    } catch (err) {
      console.error(err);
      showToast("Login failed. Check your credentials", "error");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      showToast("WebSocket not connected", "error");
      return;
    }

    if (!identityKeys) {
      showToast("Identity keys not ready", "error");
      return;
    }
    
    if (!activeChat) {
      showToast("Select a chat first", "error");
      return;
    }

    // Handle file upload
    if (selectedFile) {
      try {
        console.log("Sending file:", selectedFile.name);

        const otherPublicKey = await fetchIdentityPublicKey(activeChat);
        const sharedSecret = computeSharedSecret(
          otherPublicKey,
          identityKeys.privateKeyBase64
        );

        // Encrypt file
        const encryptedFile = await encryptFile(selectedFile, sharedSecret, identityKeys.publicKeyBase64);

        // Upload encrypted file
        const result = await filesAPI.uploadFile(
          new File([encryptedFile], selectedFile.name),
          activeChat,
          token
        );

        console.log("File uploaded:", result);

        // Add file message to chat
        addMessageToChat(activeChat, {
          id: Date.now(),
          from: username,
          to: activeChat,
          text: `📎 ${selectedFile.name}`,
          isFile: true,
          fileId: result.file_id,
          fileName: selectedFile.name,
          fileSize: result.file_size,
          direction: "outgoing",
          created_at: new Date().toISOString(),
        });

        // Clear file selection
        setSelectedFile(null);
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
          fileInput.value = '';
        }
        
        // Show success toast
        showToast("File sent successfully");
        
      } catch (err) {
        console.error("Error sending file:", err);
        showToast("Error sending file: " + (err.response?.data?.detail || err.message), "error");
      }
      return;
    }

    // Handle text message
    const trimmed = messageText.trim();
    if (!trimmed) return;

    try {
      const otherPublicKey = await fetchIdentityPublicKey(activeChat);
      const sharedSecret = computeSharedSecret(
        otherPublicKey,
        identityKeys.privateKeyBase64
      );
      const ciphertext = encryptMessage(trimmed, sharedSecret, identityKeys.publicKeyBase64);

      ws.send(
        JSON.stringify({
          type: "send_message",
          to: activeChat,
          ciphertext,
        })
      );

      addMessageToChat(activeChat, {
        id: Date.now(),
        from: username,
        to: activeChat,
        text: trimmed,
        direction: "outgoing",
        created_at: new Date().toISOString(),
      });

      setMessageText("");
    } catch (err) {
      console.error("Error sending message:", err);
      showToast("Error sending message", "error");
    }
  };

  // Handle file download
  const handleFileDownload = async (fileId, fileName) => {
    try {
      console.log("Downloading file:", fileId);

      const encryptedBlob = await filesAPI.downloadFile(fileId, token);

      const otherPublicKey = await fetchIdentityPublicKey(activeChat);
      const sharedSecret = computeSharedSecret(
        otherPublicKey,
        identityKeys.privateKeyBase64
      );

      // Decrypt file
      const decryptedData = await decryptFile(encryptedBlob, sharedSecret);

      // Download
      const blob = new Blob([decryptedData]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast("File downloaded successfully");
    } catch (err) {
      console.error("Error downloading file:", err);
      showToast("Error downloading file", "error");
    }
  };

  // Loading state
  if (!identityKeys) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Sandeshaa Prototype</h2>
          <p>Generating identity keys… (first time only)</p>
        </div>
      </div>
    );
  }

  // Auth page
  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Sandeshaa Prototype – Auth</h2>
          <div className="key-display">
            <p>Your public identity key (shared with server):</p>
            <code>{identityKeys.publicKeyBase64}</code>
          </div>

          <div className="auth-tabs">
            <button
              className={isRegisterMode ? "active" : ""}
              onClick={() => setIsRegisterMode(true)}
            >
              Register
            </button>
            <button
              className={!isRegisterMode ? "active" : ""}
              onClick={() => setIsRegisterMode(false)}
            >
              Login
            </button>
          </div>

          <form
            className="auth-form"
            onSubmit={isRegisterMode ? handleRegister : handleLogin}
          >
            <div className="form-group">
              <label>Username</label>
              <input
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                required
                placeholder="Enter your username"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            <button type="submit" className="btn-primary">
              {isRegisterMode ? "Register" : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main chat interface
  const chatList = Object.keys(chats).sort((a, b) => {
    const timeA = chats[a].lastMessageTime || "";
          <button onClick={logout} className="btn-logout" title="Logout">
            Logout
          </button>    
          const timeB = chats[b].lastMessageTime || "";
    return timeB.localeCompare(timeA);
  });

  const currentMessages = activeChat ? chats[activeChat]?.messages || [] : [];

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h2>Sandeshaa</h2>
        <div className="user-info">
          <span>
            Logged in as <strong>{username}</strong>
          </span>
          <span className={`ws-status ${wsStatus.toLowerCase()}`}>
            {wsStatus}
          </span>
          <button onClick={logout} className="btn-logout" title="Logout">
            Logout
          </button>
        </div>
      </header>

      <div className="chat-main">
        {/* Left: Chat List */}
        <div className="chat-list-sidebar">
          <div className="chat-list-header">
            <h3>Chats</h3>
            <button
              className="btn-new-chat"
              onClick={() => setShowNewChatModal(true)}
              title="Start new chat"
            >
              +
            </button>
          </div>

          {chatList.length === 0 ? (
            <div className="no-chats">
              <p>No chats yet</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="btn-primary"
              >
                Start a Chat
              </button>
            </div>
          ) : (
            <div className="chat-list">
              {chatList.map((chatUsername) => {
                const chat = chats[chatUsername];
                return (
                  <div
                    key={chatUsername}
                    className={`chat-list-item ${
                      activeChat === chatUsername ? "active" : ""
                    }`}
                    onClick={() => selectChat(chatUsername)}
                  >
                    <div className="chat-avatar">
                      {chatUsername.charAt(0).toUpperCase()}
                    </div>
                    <div className="chat-info">
                      <div className="chat-name-row">
                        <span className="chat-name">{chatUsername}</span>
                        {chat.unread > 0 && (
                          <span className="unread-badge">{chat.unread}</span>
                        )}
                      </div>
                      <p className="chat-preview">
                        {chat.lastMessage || "No messages yet"}
                      </p>
                    </div>
                    <button
                      className="btn-delete-chat"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chatUsername);
                      }}
                      title="Delete chat"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Messages Area */}
        <div className="messages-container">
          {!activeChat ? (
            <div className="no-chat-selected">
              <h3>Select a chat to start messaging</h3>
              <p>or</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="btn-primary"
              >
                Start New Chat
              </button>
            </div>
          ) : (
            <>
              <div className="messages-header">
                <h3>{activeChat}</h3>
              </div>

              <div className="messages-area">
                {currentMessages.length === 0 ? (
                  <p className="no-messages">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  currentMessages.map((m, index) => (
                    <div key={`${m.id}_${index}_${m.created_at}`} className={`message-bubble ${m.direction}`}>
                      <div className="message-content">
                        {m.isFile ? (
                          <div className="file-message">
                            <div className="file-icon">📎</div>
                            <div className="file-info">
                              <div className="file-name">{m.fileName}</div>
                              <div className="file-size">
                                {(m.fileSize / 1024).toFixed(1)} KB
                              </div>
                            </div>
                            {m.direction === "incoming" && (
                              <button
                                onClick={() =>
                                  handleFileDownload(m.fileId, m.fileName)
                                }
                                className="btn-download"
                              >
                                ⬇️
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="message-text">{m.text}</div>
                        )}
                        <div className="message-time">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form className="message-input-form" onSubmit={handleSendMessage}>
                <FileUpload
                  onFileSelect={setSelectedFile}
                  disabled={!activeChat}
                  selectedFile={selectedFile}
                />
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={selectedFile ? `Sending: ${selectedFile.name}` : "Type a message..."}
                  className="message-input"
                  disabled={!!selectedFile}
                />
                <button
                  type="submit"
                  className="btn-send"
                  disabled={!messageText.trim() && !selectedFile}
                >
                  {selectedFile ? '📤 Send' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowNewChatModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Start New Chat</h3>
            <input
              type="text"
              value={newChatUsername}
              onChange={(e) => setNewChatUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
              onKeyPress={(e) => e.key === "Enter" && startNewChat()}
            />
            <div className="modal-actions">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={startNewChat} className="btn-primary">
                Start Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;