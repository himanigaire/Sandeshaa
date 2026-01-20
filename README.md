# 🔐 Sandeshaa

**Sandeshaa** (संदेश - meaning "message" in Nepali) is a secure, end-to-end encrypted messaging application with cross-platform support for Web and Mobile platforms.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [API Endpoints](#-api-endpoints)
- [Security Features](#-security-features)
- [Configuration](#-configuration)
- [Auto-Cleanup Features](#-auto-cleanup-features)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

Sandeshaa is a full-stack messaging application that prioritizes user privacy through **end-to-end encryption (E2EE)**. Messages are encrypted on the sender's device and can only be decrypted by the recipient using their private key. Even the server cannot read the message contents.

The project consists of three main components:
1. **Backend** - FastAPI server handling authentication, message routing, and encrypted storage
2. **Frontend** - React-based web application with real-time WebSocket communication
3. **Mobile App** - React Native (Expo) application for iOS and Android with secure key storage

### Key Highlights
- ✅ True end-to-end encryption using NaCl cryptography
- ✅ Cross-platform support (Web, iOS, Android)
- ✅ Real-time messaging via WebSockets
- ✅ Encrypted file sharing with type validation
- ✅ Automatic message and file cleanup
- ✅ Device key synchronization
- ✅ Secure authentication with JWT

---

## ✨ Features

### Core Features
- 🔒 **End-to-End Encryption** - Messages encrypted using NaCl (TweetNaCl) cryptography with Curve25519 key exchange
- 👤 **User Authentication** - Secure JWT-based authentication with bcrypt password hashing
- 💬 **Real-time Messaging** - WebSocket-based instant message delivery with connection management
- 📁 **Encrypted File Sharing** - Send and receive encrypted files (max 10MB) with security validation
- 📱 **Cross-Platform** - Seamless experience across Web and Mobile (iOS/Android)
- 🔑 **Device Key Sync** - Automatic public key synchronization across devices on login

### Additional Features
- 📋 **Conversation List** - View all active chat conversations with message counts
- 🗑️ **Delete Chats** - Remove entire chat history with a user
- 🔐 **Secure Key Storage** 
  - Web: localStorage for keys
  - Mobile: Expo SecureStore (encrypted storage)
- ⚡ **Message Caching** - Local message storage for quick access
- 🧹 **Auto-Cleanup** - Automatic deletion of old messages (7 days) and files (24 hours)
- 🛡️ **File Security** - Whitelist-based file type validation, blocking executables and scripts
- 🔄 **Message Delivery Status** - Track message delivery state
- 🌐 **CORS Support** - Configured for multiple frontend origins

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │     │  Mobile Client  │     │  Mobile Client  │
│   (React/Vite)  │     │  (Expo/RN)      │     │  (Expo/RN)      │
│   - localStorage│     │   - SecureStore │     │   - SecureStore │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │    HTTPS/WSS          │    HTTPS/WSS          │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     FastAPI Backend     │
                    │   - REST API            │
                    │   - WebSocket Server    │
                    │   - JWT Authentication  │
                    │   - APScheduler         │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      MySQL Database     │
                    │   - Users               │
                    │   - Messages            │
                    │   - File Messages       │
                    └─────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     File Storage        │
                    │   - uploads/            │
                    │   (Encrypted files)     │
                    └─────────────────────────┘
```

### End-to-End Encryption Flow

```
Sender                                              Recipient
  │                                                      │
  │  1. Generate message plaintext                       │
  │  2. Fetch recipient's public key from server         │
  │  3. Compute shared secret (ECDH)                     │
  │  4. Encrypt with NaCl box (XSalsa20-Poly1305)        │
  │  5. Create payload (v:1, nonce, box, from_pub)       │
  │  6. Send JSON ciphertext via WebSocket ─────────►    │
  │                                                      │
  │                              7. Receive ciphertext   │
  │                              8. Parse JSON payload   │
  │                              9. Extract sender's     │
  │                                 public key from msg  │
  │                             10. Compute shared       │
  │                                 secret (ECDH)        │
  │                             11. Decrypt with NaCl    │
  │                                 box.open             │
  │                             12. Display plaintext    │
```

**Encryption Payload Format:**
```json
{
  "v": 1,
  "nonce": "<base64-encoded-24-byte-nonce>",
  "box": "<base64-encoded-ciphertext>",
  "from_pub": "<base64-encoded-sender-public-key>"
}
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.10+ | Programming Language |
| **FastAPI** | Latest | Web Framework & REST API |
| **SQLAlchemy** | Latest | ORM for database operations |
| **MySQL** | 8.0+ | Relational Database |
| **python-jose** | Latest | JWT Token generation/validation |
| **passlib** | Latest | bcrypt Password Hashing |
| **WebSockets** | Built-in | Real-time bidirectional communication |
| **APScheduler** | Latest | Background task scheduling (cleanup) |
| **python-magic** | Latest | File type validation |
| **python-dotenv** | Latest | Environment variable management |

### Frontend (Web)
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19 | UI Framework |
| **Vite** | Latest | Build Tool & Dev Server |
| **JavaScript (JSX)** | ES6+ | Programming Language |
| **TweetNaCl** | Latest | NaCl Cryptography Library |
| **tweetnacl-util** | Latest | Base64 encoding/decoding |
| **Axios** | Latest | HTTP Client for API calls |
| **WebSocket API** | Native | Real-time messaging |

### Mobile App
| Technology | Version | Purpose |
|------------|---------|---------|
| **React Native** | Latest | Mobile Framework |
| **Expo SDK** | 54 | Development Platform |
| **TypeScript** | Latest | Programming Language |
| **TweetNaCl** | Latest | NaCl Cryptography Library |
| **tweetnacl-util** | Latest | Base64 encoding/decoding |
| **Expo SecureStore** | Latest | Encrypted key storage |
| **Expo Router** | Latest | File-based navigation |
| **Expo Random** | Latest | Cryptographically secure random bytes |

---

## 📁 Project Structure

```
Sandeshaa/
├── README.md                     # Main documentation
├── API_DOCUMENTATION.md          # Detailed API documentation
├── start-web.sh                  # Script to start backend + frontend
│
├── Backend/
│   ├── main.py                   # FastAPI app, endpoints, WebSocket, cleanup
│   ├── models.py                 # SQLAlchemy models (User, Message, FileMessage)
│   ├── schemas.py                # Pydantic schemas for request/response
│   ├── auth.py                   # JWT & password hashing utilities
│   ├── database.py               # Database configuration & session
│   ├── .env                      # Environment variables (not tracked)
│   ├── requirements.txt          # Python dependencies
│   └── uploads/                  # Encrypted file storage directory
│
├── Frontend/
│   ├── src/
│   │   ├── App.jsx               # Main component with auth & chat logic
│   │   ├── api.js                # API client functions (register, login, etc.)
│   │   ├── crypto.js             # E2EE functions (encrypt/decrypt)
│   │   ├── main.jsx              # React entry point
│   │   └── components/
│   │       └── FileUpload.jsx    # File upload component
│   ├── index.html                # HTML entry point
│   ├── package.json              # npm dependencies
│   ├── vite.config.js            # Vite configuration
│   └── README.md                 # Frontend-specific notes
│
└── SandeshaaMobile/
    ├── app/
    │   ├── _layout.tsx           # Root navigation layout
    │   ├── login.tsx             # Login screen with key sync
    │   ├── register.tsx          # Registration screen
    │   ├── chat.tsx              # Individual chat screen with WebSocket
    │   ├── chats.tsx             # List of conversations
    │   └── (tabs)/               # Tab navigation screens
    │       ├── index.tsx         # Home/Profile tab
    │       └── explore.tsx       # Explore tab
    ├── src/
    │   ├── api.ts                # API client functions (TypeScript)
    │   ├── crypto.ts             # E2EE functions with SecureStore
    │   └── config.ts             # API base URL configuration
    ├── components/               # Reusable UI components
    ├── scripts/
    │   └── reset-project.js      # Expo project reset utility
    ├── app.json                  # Expo configuration
    ├── package.json              # npm dependencies
    └── README.md                 # Mobile-specific notes
```

---

## 🚀 Installation & Setup

### Prerequisites

- **Python 3.10+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (included with Node.js)
- **MySQL 8.0+** - [Download](https://dev.mysql.com/downloads/)
- **Expo CLI** (for mobile) - Install with `npm install -g expo-cli`
- **Expo Go App** (for mobile testing) - Available on App Store / Play Store

### Backend Setup

1. **Navigate to Backend directory:**
   ```bash
   cd Sandeshaa/Backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install fastapi uvicorn sqlalchemy pymysql python-jose[cryptography] passlib[bcrypt] python-multipart python-dotenv apscheduler python-magic
   ```

4. **Set up MySQL database:**
   ```sql
   CREATE DATABASE sandeshaa;
   CREATE USER 'sandeshaa_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON sandeshaa.* TO 'sandeshaa_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

5. **Create `.env` file:**
   ```env
   DATABASE_URL=mysql+pymysql://sandeshaa_user:your_password@localhost/sandeshaa
   SECRET_KEY=XnBzj8X-d-Nns70kz62RCbxbeQk0lRds3SOwPKTLsAA
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ```

6. **Create uploads directory:**
   ```bash
   mkdir uploads
   ```

7. **Run the server:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

   The backend will be available at `http://localhost:8000`
   - API Docs: `http://localhost:8000/docs`
   - Alternative Docs: `http://localhost:8000/redoc`

### Frontend (Web) Setup

1. **Navigate to Frontend directory:**
   ```bash
   cd Sandeshaa/Frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API URL (optional):**
   Edit `src/api.js` if backend is not on localhost:8000
   ```javascript
   const apiClient = axios.create({
     baseURL: "http://127.0.0.1:8000",
   });
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   The web app will be available at `http://localhost:5173`

### Mobile App Setup

1. **Navigate to Mobile directory:**
   ```bash
   cd Sandeshaa/SandeshaaMobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Update API configuration:**
   
   **Find your computer's IP address:**
   - **macOS/Linux:** `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - **Windows:** `ipconfig` (look for IPv4 Address)

   **Edit `src/config.ts`:**
   ```typescript
   export const API_BASE_URL = "http://YOUR_COMPUTER_IP:8000";
   ```

   **Edit `app/chat.tsx` and `app/chats.tsx`:**
   ```typescript
   const API_BASE = "http://YOUR_COMPUTER_IP:8000";
   const WS_BASE = "ws://YOUR_COMPUTER_IP:8000/ws";
   ```

   > ⚠️ **Important:** Use your computer's local IP (e.g., `192.168.1.65`), not `localhost` or `127.0.0.1`

4. **Start the Expo server:**
   ```bash
   npx expo start
   ```

5. **Run on device:**
   - **Physical Device:** Scan the QR code with **Expo Go** app
   - **Android Emulator:** Press `a` in the terminal
   - **iOS Simulator:** Press `i` in the terminal (macOS only)

### Quick Start Script

For web development, use the provided script:

```bash
chmod +x start-web.sh
./start-web.sh
```

This will start both backend and frontend servers simultaneously.

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register a new user with username, password, and public keys | No |
| POST | `/login` | Login and receive JWT access token | No |
| GET | `/me` | Get current authenticated user info | Yes |
| PUT | `/me/public-key` | Update user's identity public key (for device sync) | Yes |

### Messaging
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/messages/{username}` | Get all text messages with specified user | Yes |
| DELETE | `/messages/{username}` | Delete entire chat history with specified user | Yes |
| GET | `/conversations` | List all active conversations with message counts | Yes |
| WS | `/ws?token={jwt}` | WebSocket connection for real-time messaging | Yes |

### Users & Keys
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/{username}/keys` | Get user's public keys for encryption | No |

### Files
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/upload-file` | Upload encrypted file (max 10MB) | Yes |
| GET | `/download-file/{file_id}` | Download encrypted file | Yes |
| GET | `/file-messages/{username}` | Get file message metadata with specified user | Yes |

### WebSocket Message Format

**Send Message (Client → Server):**
```json
{
  "type": "message",
  "to": "recipient_username",
  "ciphertext": "{\"v\":1,\"nonce\":\"...\",\"box\":\"...\",\"from_pub\":\"...\"}"
}
```

**Receive Message (Server → Client):**
```json
{
  "type": "message",
  "from": "sender_username",
  "ciphertext": "{\"v\":1,\"nonce\":\"...\",\"box\":\"...\",\"from_pub\":\"...\"}",
  "timestamp": "2026-01-20T10:30:00Z"
}
```

---

## 🔐 Security Features

### Encryption

**Algorithm Stack:**
- **Key Exchange:** Elliptic Curve Diffie-Hellman (X25519)
- **Symmetric Encryption:** XSalsa20 stream cipher
- **Authentication:** Poly1305 MAC
- **Combined:** NaCl Box (Curve25519 + XSalsa20 + Poly1305)

**Message Encryption Process:**
1. Generate random 24-byte nonce
2. Compute shared secret using ECDH (recipient's public key + sender's private key)
3. Encrypt message bytes using `nacl.box.after(message, nonce, sharedSecret)`
4. Package as JSON: `{v:1, nonce, box, from_pub}`
5. Send JSON string to server

**Message Decryption Process:**
1. Parse JSON payload
2. Extract nonce, ciphertext (box), and sender's public key
3. Compute shared secret using ECDH (sender's public key + recipient's private key)
4. Decrypt using `nacl.box.open.after(box, nonce, sharedSecret)`
5. Return plaintext

### Key Management

**Identity Keys:**
- **Generation:** Once per device using `nacl.box.keyPair()`
- **Format:** 32-byte Curve25519 keys, stored as base64
- **Storage:**
  - **Web:** `localStorage` (accessible only to origin)
  - **Mobile:** Expo SecureStore (encrypted, hardware-backed on iOS)
- **Lifecycle:** Created on first use, persisted indefinitely

**Key Synchronization:**
- Public key uploaded to server during registration
- Public key synced to server after login (for new devices)
- Server stores public keys for key distribution
- Private keys **NEVER** leave the device

**Prekey System:**
- Each user has a prekey public key (for future use)
- Currently using identity key as prekey
- Designed for future one-time prekey implementation

### Authentication

**Password Security:**
- **Algorithm:** bcrypt with automatic salt generation
- **Truncation:** Passwords truncated to 72 bytes (bcrypt limitation)
- **Storage:** Only hashed passwords stored in database
- **Verification:** Constant-time comparison via bcrypt

**Session Management:**
- **Tokens:** JWT (JSON Web Tokens)
- **Algorithm:** HS256 (HMAC-SHA256)
- **Expiration:** 24 hours (1440 minutes)
- **Claims:** `sub` (username), `exp` (expiration time)
- **Storage:**
  - **Web:** localStorage
  - **Mobile:** Expo SecureStore

**Protected Routes:**
- Bearer token authentication via `Authorization` header
- Token validated on every protected endpoint
- Invalid/expired tokens return 401 Unauthorized

### File Security

**Upload Validation:**
- **Size Limit:** 10 MB maximum
- **Type Validation:** MIME type checked using `python-magic`
- **Blocked Types:** 
  - Executables: `.exe`, `.dll`, `.so`, `.dylib`
  - Scripts: `.sh`, `.bat`, `.ps1`, `.vbs`, `.js` (standalone)
  - Macros: `.xlsm`, `.docm`, `.pptm`
  - Archives: `.zip`, `.rar`, `.7z` (potential for embedded malware)
  - HTML: `.html`, `.htm` (XSS risk)

**Allowed Types:**
- Documents: `.pdf`, `.docx`, `.xlsx`, `.pptx`, `.txt`
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.svg`
- Media: `.mp3`, `.mp4`, `.avi`, `.mkv`, `.wav`

**Storage:**
- Files encrypted before upload
- Stored with unique filename: `{timestamp}_{random}_{original_name}`
- Only accessible via authenticated download endpoint
- Recipient must be sender or receiver

### WebSocket Security

**Connection:**
- Token passed as query parameter: `?token={jwt}`
- Connection refused if token invalid
- Connection manager tracks active connections by username

**Message Routing:**
- Server validates sender identity from JWT
- Server checks recipient exists before routing
- Message stored in database for offline delivery
- Message delivered immediately if recipient online

---

## ⚙️ Configuration

### Backend Configuration

**Environment Variables (`.env`):**
```env
# Database
DATABASE_URL=mysql+pymysql://username:password@localhost/sandeshaa

# JWT
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# File Upload
MAX_FILE_SIZE=10485760  # 10 MB in bytes
UPLOAD_DIR=./uploads
```

**CORS Settings (`main.py`):**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Alternative port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Frontend Configuration

**API Client (`src/api.js`):**
```javascript
const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000",
});
```

**WebSocket Connection (`src/App.jsx`):**
```javascript
const ws = new WebSocket(`ws://127.0.0.1:8000/ws?token=${token}`);
```

### Mobile Configuration

**API Base URL (`src/config.ts`):**
```typescript
export const API_BASE_URL = "http://192.168.1.65:8000";
```

**WebSocket Connection (`app/chat.tsx`, `app/chats.tsx`):**
```typescript
const API_BASE = "http://192.168.1.65:8000";
const WS_BASE = "ws://192.168.1.65:8000/ws";
```

> 💡 **Pro Tip:** Use environment variables for different environments (dev, staging, prod)

---

## 🧹 Auto-Cleanup Features

### Automatic Message Deletion

**Configuration:**
```python
# Runs every day at midnight
scheduler.add_job(cleanup_old_messages, "cron", hour=0, minute=0)
```

**Policy:**
- Messages older than **7 days** are automatically deleted
- Applies to both sent and received messages
- Irreversible deletion from database

**Implementation:**
```python
def cleanup_old_messages():
    cutoff_date = datetime.utcnow() - timedelta(days=7)
    deleted = db.query(Message).filter(Message.created_at < cutoff_date).delete()
    print(f"🗑️ Deleted {deleted} old messages")
```

### Automatic File Deletion

**Configuration:**
```python
# Runs every hour
scheduler.add_job(cleanup_old_files, "interval", hours=1)
```

**Policy:**
- Files older than **24 hours** are automatically deleted
- Removes both database records and physical files
- Prevents storage bloat

**Implementation:**
```python
def cleanup_old_files():
    cutoff_date = datetime.utcnow() - timedelta(hours=24)
    old_files = db.query(FileMessage).filter(FileMessage.created_at < cutoff_date).all()
    
    for file_msg in old_files:
        file_path = os.path.join("uploads", file_msg.stored_filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        db.delete(file_msg)
    
    print(f"🗑️ Deleted {len(old_files)} old files")
```

**Scheduler Lifecycle:**
- Starts automatically when FastAPI app starts
- Runs in background thread (non-blocking)
- Gracefully shuts down on app termination

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
   ```bash
   git clone https://github.com/himanigaire/Sandeshaa.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Add tests if applicable
   - Update documentation
   - Follow existing code style

4. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```

5. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Describe your changes
   - Reference any related issues

### Development Guidelines
- Use meaningful commit messages
- Write clean, commented code
- Test thoroughly before submitting
- Update README if adding new features

---

## 📄 License

This project is developed as part of a **7th Semester Computer Science Project** at University of West of England.

**Status:** Academic Project (Single Developer)

**Rights:** All rights reserved by the author. For academic evaluation and learning purposes.

---

## 👥 Authors

- **Himani Gaire** - *Full Stack Developer*
  - Backend development (FastAPI, MySQL)
  - Frontend development (React, Vite)
  - Mobile development (React Native, Expo)
  - End-to-end encryption implementation
  - Security architecture

---

## 🙏 Acknowledgments

Special thanks to the following open-source projects and resources:

- **[TweetNaCl](https://tweetnacl.js.org/)** - Cryptography library (NaCl/libsodium port to JavaScript)
- **[FastAPI](https://fastapi.tiangolo.com/)** - Modern Python web framework
- **[Expo](https://expo.dev/)** - React Native development platform
- **[React](https://react.dev/)** - JavaScript UI library
- **[Vite](https://vitejs.dev/)** - Next-generation frontend tooling
- **[SQLAlchemy](https://www.sqlalchemy.org/)** - Python SQL toolkit and ORM
- **[Signal Protocol](https://signal.org/docs/)** - Inspiration for E2EE architecture

### Learning Resources
- [Understanding the Signal Protocol](https://signal.org/docs/)
- [NaCl Cryptography Library Documentation](https://nacl.cr.yp.to/)
- [FastAPI WebSocket Documentation](https://fastapi.tiangolo.com/advanced/websockets/)
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)

---

## 📞 Support & Contact

For questions, issues, or suggestions:

- **GitHub Issues:** 
- **Email:** hi.gaire3@gmail.com
- **Documentation:** See `API_DOCUMENTATION.md` for detailed API reference

---

## 🗺️ Roadmap

Future enhancements planned:

- [ ] Group messaging support
- [ ] Voice/video call integration
- [ ] Message reactions and replies
- [ ] Read receipts
- [ ] Push notifications
- [ ] Profile pictures
- [ ] Message search functionality
- [ ] Export chat history (encrypted)
- [ ] Multi-device synchronization
- [ ] One-time prekey implementation (Signal Protocol)

---
