// src/App.jsx
import React, { useEffect, useState, useRef } from "react";
import { registerUser, loginUser, getUserKeys } from "./api";
import {
  getOrCreateIdentityKeys,
  computeSharedSecret,
  encryptMessage,
  decryptMessage,
  encryptFile,
  decryptFile,
} from "./crypto";
import FileUpload from "./components/FileUpload";

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

  // NEW: Chat list management
  const [chats, setChats] = useState({}); // { username: { messages: [], unread: 0, lastMessage: "" } }
  const [activeChat, setActiveChat] = useState(null); // Currently selected chat username
  const [messageText, setMessageText] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState("");

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
        } else if (data.type === "sent") {
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
      const isUnread = activeChat !== chatUsername && message.direction === "incoming";

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
      alert("You can't chat with yourself!");
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
      alert("Keys not ready yet, please wait a second and try again.");
      return;
    }
    if (!authUsername || !authPassword) {
      alert("Please enter username and password");
      return;
    }

    try {
      await registerUser({
        username: authUsername,
        password: authPassword,
        identityPublicKey: identityKeys.publicKeyBase64,
        prekeyPublic: identityKeys.publicKeyBase64,
      });
      alert("Registration successful! Now log in.");
      setIsRegisterMode(false);
    } catch (err) {
      console.error(err);
      alert("Registration failed (maybe username already taken). Check console.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!authUsername || !authPassword) {
      alert("Please enter username and password");
      return;
    }
    try {
      const data = await loginUser({
        username: authUsername,
        password: authPassword,
      });
      setToken(data.access_token);
      setUsername(authUsername);
      connectWebSocket(data.access_token);
    } catch (err) {
      console.error(err);
      alert("Login failed. Check console for details.");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
  
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert("WebSocket not connected.");
      return;
    }
  
    if (!identityKeys || !activeChat) {
      return;
    }
  
    // Handle file upload
    if (selectedFile) {
      try {
        console.log('Sending file:', selectedFile.name);
        
        const otherPublicKey = await fetchIdentityPublicKey(activeChat);
        const sharedSecret = computeSharedSecret(
          otherPublicKey,
          identityKeys.privateKeyBase64
        );
  
        // Encrypt file
        const encryptedFile = await encryptFile(selectedFile, sharedSecret);
        
        // Upload encrypted file
        const result = await filesAPI.uploadFile(
          new File([encryptedFile], selectedFile.name),
          activeChat,
          token
        );
  
        console.log('File uploaded:', result);
  
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
  
        setSelectedFile(null);
        alert('File sent successfully!');
      } catch (err) {
        console.error("Error sending file:", err);
        alert("Error sending file: " + (err.response?.data?.detail || err.message));
      }
      return;
    }
  
    // Handle text message (existing code)
    const trimmed = messageText.trim();
    if (!trimmed) return;
  
    try {
      const otherPublicKey = await fetchIdentityPublicKey(activeChat);
      const sharedSecret = computeSharedSecret(
        otherPublicKey,
        identityKeys.privateKeyBase64
      );
      const ciphertext = encryptMessage(trimmed, sharedSecret);
  
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
      alert("Error sending message. See console.");
    }
  };

  // Handle file download
const handleFileDownload = async (fileId, fileName) => {
  try {
    console.log('Downloading file:', fileId);
    
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
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('File downloaded successfully!');
  } catch (err) {
    console.error("Error downloading file:", err);
    alert("Error downloading file. Check console.");
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

          <form className="auth-form" onSubmit={isRegisterMode ? handleRegister : handleLogin}>
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
    const timeB = chats[b].lastMessageTime || "";
    return timeB.localeCompare(timeA);
  });

  const currentMessages = activeChat ? chats[activeChat]?.messages || [] : [];

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h2>Sandeshaa</h2>
        <div className="user-info">
          <span>Logged in as <strong>{username}</strong></span>
          <span className={`ws-status ${wsStatus.toLowerCase()}`}>
            {wsStatus}
          </span>
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
              <button onClick={() => setShowNewChatModal(true)} className="btn-primary">
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
                    className={`chat-list-item ${activeChat === chatUsername ? "active" : ""}`}
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
              <button onClick={() => setShowNewChatModal(true)} className="btn-primary">
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
                  <p className="no-messages">No messages yet. Start the conversation!</p>
                ) : (
                  currentMessages.map((m) => (
                    <div key={m.id} className={`message-bubble ${m.direction}`}>
                      <div className="message-content">
                        <div className="message-text">{m.text}</div>
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
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="message-input"
                />
                <button type="submit" className="btn-send" disabled={!messageText.trim()}>
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="modal-overlay" onClick={() => setShowNewChatModal(false)}>
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
              <button onClick={() => setShowNewChatModal(false)} className="btn-secondary">
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
