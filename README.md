# 🔐 Sandeshaa

**Sandeshaa** (संदेशा - meaning "message" in Nepali) is a secure, end-to-end encrypted messaging application with cross-platform support for Web and Mobile.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend (Web) Setup](#frontend-web-setup)
  - [Mobile App Setup](#mobile-app-setup)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

Sandeshaa is a full-stack messaging application that prioritizes user privacy through **end-to-end encryption (E2EE)**. Messages are encrypted on the sender's device and can only be decrypted by the intended recipient, ensuring that not even the server can read the message content.

The project consists of three main components:
1. **Backend** - FastAPI server handling authentication, message routing, and storage
2. **Frontend** - React-based web application
3. **Mobile App** - React Native (Expo) application for iOS and Android

---

## ✨ Features

### Core Features
- 🔒 **End-to-End Encryption** - Messages encrypted using NaCl (TweetNaCl) cryptography
- 👤 **User Authentication** - Secure JWT-based authentication
- 💬 **Real-time Messaging** - WebSocket-based instant message delivery
- 📁 **Encrypted File Sharing** - Send encrypted files securely
- 📱 **Cross-Platform** - Web and Mobile (iOS/Android) support
- 🔑 **Device Key Sync** - Automatic public key synchronization across devices

### Additional Features
- 📋 **Conversation List** - View all chat conversations
- 🗑️ **Delete Chats** - Remove chat history
- 🔐 **Secure Key Storage** - Keys stored securely on device
- ⚡ **Message Caching** - Local message storage for offline access

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │     │  Mobile Client  │     │  Mobile Client  │
│   (React/Vite)  │     │  (Expo/RN)      │     │  (Expo/RN)      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │    HTTPS/WSS          │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │     FastAPI Backend     │
                    │   - REST API            │
                    │   - WebSocket Server    │
                    │   - JWT Authentication  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      SQLite Database    │
                    │   - Users               │
                    │   - Messages            │
                    │   - Files               │
                    └─────────────────────────┘
```

### End-to-End Encryption Flow

```
Sender                                              Recipient
  │                                                      │
  │  1. Generate message                                 │
  │  2. Fetch recipient's public key                     │
  │  3. Encrypt with NaCl box                            │
  │  4. Send encrypted ciphertext ──────────────────►    │
  │                                                      │
  │                              5. Receive ciphertext   │
  │                              6. Decrypt with own     │
  │                                 private key          │
  │                              7. Display message      │
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Python 3.10+** | Programming Language |
| **FastAPI** | Web Framework |
| **SQLAlchemy** | ORM |
| **SQLite** | Database |
| **python-jose** | JWT Tokens |
| **passlib** | Password Hashing |
| **WebSockets** | Real-time Communication |

### Frontend (Web)
| Technology | Purpose |
|------------|---------|
| **React 19** | UI Framework |
| **Vite** | Build Tool |
| **JavaScript (JSX)** | Programming Language |
| **TweetNaCl** | Encryption Library |
| **Axios** | HTTP Client |

### Mobile App
| Technology | Purpose |
|------------|---------|
| **React Native** | Mobile Framework |
| **Expo SDK 54** | Development Platform |
| **TypeScript** | Programming Language |
| **TweetNaCl** | Encryption Library |
| **Expo SecureStore** | Secure Key Storage |
| **Expo Router** | Navigation |

---

## 📁 Project Structure

```
Sandeshaa/
├── README.md                 # This file
├── Backend/
│   ├── main.py              # FastAPI application & endpoints
│   ├── models.py            # SQLAlchemy database models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth.py              # Authentication utilities
│   ├── database.py          # Database configuration
│   └── uploads/             # Uploaded files storage
│
├── Frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   ├── api.js           # API client functions
│   │   ├── crypto.js        # Encryption utilities
│   │   ├── main.jsx         # Entry point
│   │   └── components/
│   │       └── FileUpload.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── SandeshaaMobile/
    ├── app/
    │   ├── _layout.tsx      # Root layout
    │   ├── login.tsx        # Login screen
    │   ├── register.tsx     # Registration screen
    │   ├── chat.tsx         # Chat screen
    │   ├── chats.tsx        # Conversations list
    │   └── (tabs)/          # Tab navigation
    ├── src/
    │   ├── api.ts           # API client functions
    │   ├── crypto.ts        # Encryption utilities
    │   └── config.ts        # Configuration
    ├── components/          # Reusable components
    ├── app.json
    └── package.json
```

---

## 🚀 Installation & Setup

### Prerequisites

- **Python 3.10+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** or **yarn**
- **Expo CLI** - `npm install -g expo-cli`
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
   pip install fastapi uvicorn sqlalchemy python-jose passlib python-multipart python-dotenv apscheduler python-magic
   ```

4. **Create `.env` file:**
   ```env
   SECRET_KEY=your-super-secret-key-change-this
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

5. **Run the server:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

   The backend will be available at `http://localhost:8000`

### Frontend (Web) Setup

1. **Navigate to Frontend directory:**
   ```bash
   cd Sandeshaa/Frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
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
   Edit `src/config.ts` and update the IP address:
   ```typescript
   export const API_BASE_URL = "http://YOUR_COMPUTER_IP:8000";
   ```
   
   > ⚠️ Use your computer's local IP (e.g., `192.168.1.65`), not `localhost`

4. **Start the Expo server:**
   ```bash
   npx expo start
   ```

5. **Run on device:**
   - Scan the QR code with **Expo Go** app
   - Or press `a` for Android emulator / `i` for iOS simulator

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | Login and get JWT token |
| GET | `/me` | Get current user info |
| PUT | `/me/public-key` | Update user's public key |

### Messaging
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages/{username}` | Get messages with a user |
| DELETE | `/messages/{username}` | Delete chat with a user |
| GET | `/conversations` | List all conversations |
| WS | `/ws?token={jwt}` | WebSocket for real-time messaging |

### Users & Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/{username}/keys` | Get user's public keys |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload-file` | Upload encrypted file |
| GET | `/download-file/{id}` | Download encrypted file |

---

## 🔐 Security Features

### Encryption
- **Algorithm:** NaCl Box (Curve25519 + XSalsa20 + Poly1305)
- **Key Exchange:** Elliptic Curve Diffie-Hellman (X25519)
- **Message Format:** JSON with nonce, ciphertext, and sender's public key

### Key Management
- **Identity Keys:** Generated once per device, stored securely
- **Key Sync:** Public keys synchronized with server after login
- **Secure Storage:** 
  - Web: localStorage (keys only)
  - Mobile: Expo SecureStore (encrypted storage)

### Authentication
- **Password Hashing:** bcrypt with salt
- **Session Tokens:** JWT with configurable expiration
- **Protected Routes:** Bearer token authentication

### File Security
- **Validation:** File type whitelist, size limits
- **Blocked Types:** Executables, scripts, macros
- **Encrypted Storage:** Files encrypted before upload

---

## ⚙️ Configuration

### Backend Configuration (`.env`)
```env
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend Configuration
Update API URL in `src/api.js`:
```javascript
const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000",
});
```

### Mobile Configuration
Update IP in `src/config.ts`:
```typescript
export const API_BASE_URL = "http://192.168.1.65:8000";
```

And in `app/chat.tsx` and `app/chats.tsx`:
```typescript
const API_BASE = "http://192.168.1.65:8000";
const WS_BASE = "ws://192.168.1.65:8000/ws";
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is developed as part of a 7th Semester CS Project.

---

## 👥 Authors

- **Himani** - *Developer*

---

## 🙏 Acknowledgments

- [TweetNaCl](https://tweetnacl.js.org/) - Cryptography library
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [Expo](https://expo.dev/) - Mobile development platform
- [React](https://react.dev/) - UI framework

---
