# 🔐 Sandeshaa

> **संदेशा** (Sandeshaa) - meaning "message" in Nepali

A secure, end-to-end encrypted messaging application with cross-platform support for Web and Mobile. Built with modern technologies and privacy-first principles.

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-000020?style=flat&logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 🌟 Overview

Sandeshaa is a full-stack messaging platform that prioritizes **user privacy through end-to-end encryption**. Messages are encrypted on the sender's device and can only be decrypted by the intended recipient - not even the server can read message content.

**Three-tier Architecture:**
- 🖥️ **Backend** - FastAPI server (Python 3.10+)
- 🌐 **Web Client** - React 19 with Vite
- 📱 **Mobile App** - React Native with Expo SDK 54

---

## ✨ Key Features

### 🔒 Security & Privacy
- **End-to-End Encryption** using NaCl (TweetNaCl) cryptography
- **Zero-knowledge architecture** - server cannot decrypt messages
- **JWT-based authentication** with secure token management
- **Encrypted file sharing** with file type validation
- **Secure key storage** (localStorage for Web, SecureStore for Mobile)

### 💬 Messaging
- **Real-time messaging** via WebSockets
- **Message history** with conversation management
- **File attachments** (encrypted before upload)
- **Message delivery status**
- **Delete conversations** functionality

### 📱 Cross-Platform
- **Web application** - Works in any modern browser
- **iOS app** - via Expo Go or standalone build
- **Android app** - via Expo Go or standalone build
- **Responsive design** - Optimized for all screen sizes

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL (or SQLite for development)

### 1️⃣ Backend Setup (5 minutes)

```bash
# Navigate to backend
cd Backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy python-jose[cryptography] passlib[bcrypt] python-multipart python-dotenv apscheduler python-magic pymysql

# Create .env file
echo "SECRET_KEY=$(openssl rand -hex 32)" > .env
echo "ALGORITHM=HS256" >> .env
echo "ACCESS_TOKEN_EXPIRE_MINUTES=30" >> .env

# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

✅ Backend running at `http://localhost:8000`

### 2️⃣ Web Frontend Setup (2 minutes)

```bash
# Navigate to frontend
cd Frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

✅ Web app running at `http://localhost:5173`

### 3️⃣ Mobile App Setup (3 minutes)

```bash
# Navigate to mobile
cd SandeshaaMobile

# Install dependencies
npm install

# Update API URL in src/config.ts
# Replace with your computer's IP address (e.g., 192.168.1.65)
export const API_BASE_URL = "http://YOUR_IP:8000";

# Start Expo
npx expo start
```

✅ Scan QR code with Expo Go app

---

## 🏗️ Architecture

### System Architecture
```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Web Client  │    │Mobile Client │    │Mobile Client │
│ (React/Vite) │    │  (Expo/RN)   │    │  (Expo/RN)   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                    │
       │            HTTPS/WebSocket             │
       └───────────────────┼────────────────────┘
                           │
              ┌────────────▼────────────┐
              │   FastAPI Backend       │
              │ • REST API              │
              │ • WebSocket Server      │
              │ • JWT Auth              │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │    MySQL Database       │
              │ • Users & Keys          │
              │ • Encrypted Messages    │
              │ • File Metadata         │
              └─────────────────────────┘
```

### E2EE Message Flow
```
👤 Alice                                           👤 Bob
  │                                                  │
  │ 1. Type message                                  │
  │ 2. Fetch Bob's public key ────────────────────► │
  │ 3. Encrypt with NaCl.box()                       │
  │ 4. Send ciphertext ────────────────────────────► │
  │                                                  │
  │                        5. Receive encrypted msg  │
  │                        6. Decrypt with own key   │
  │                        7. Display plaintext ✓    │
```

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top" width="33%">

### Backend
- **Python 3.10+**
- **FastAPI** - Modern web framework
- **SQLAlchemy** - SQL toolkit & ORM
- **MySQL** - Database
- **python-jose** - JWT tokens
- **passlib** - Password hashing
- **WebSockets** - Real-time
- **APScheduler** - Cleanup tasks

</td>
<td valign="top" width="33%">

### Web Frontend
- **React 19** - UI library
- **Vite 7** - Build tool
- **Axios** - HTTP client
- **TweetNaCl** - Encryption
- **JavaScript (JSX)**
- **CSS3** - Styling

</td>
<td valign="top" width="33%">

### Mobile App
- **React Native**
- **Expo SDK 54**
- **TypeScript**
- **Expo Router** - Navigation
- **TweetNaCl** - Encryption
- **Expo SecureStore**
- **Expo File System**

</td>
</tr>
</table>

---

## 📁 Project Structure

```
Sandeshaa/
│
├── 📄 README.md                    # You are here
├── 📄 API_DOCUMENTATION.md         # Complete API reference
├── 🚀 start-web.sh                 # Quick start script
│
├── 🔧 Backend/                     # FastAPI Server
│   ├── main.py                     # Main application & routes
│   ├── models.py                   # Database models (User, Message, File)
│   ├── schemas.py                  # Pydantic schemas
│   ├── auth.py                     # JWT authentication
│   ├── database.py                 # DB configuration
│   └── uploads/                    # Encrypted file storage
│
├── 🌐 Frontend/                    # React Web App
│   ├── src/
│   │   ├── App.jsx                 # Main component
│   │   ├── api.js                  # API client
│   │   ├── crypto.js               # Encryption utils
│   │   └── components/
│   │       └── FileUpload.jsx
│   ├── package.json                # Dependencies (React 19, Vite 7)
│   └── vite.config.js
│
└── 📱 SandeshaaMobile/             # React Native App
    ├── app/
    │   ├── _layout.tsx             # Root layout
    │   ├── login.tsx               # Auth screens
    │   ├── register.tsx
    │   ├── chat.tsx                # 1-on-1 chat
    │   ├── chats.tsx               # Conversation list
    │   └── (tabs)/                 # Bottom tab navigation
    ├── src/
    │   ├── api.ts                  # API client
    │   ├── crypto.ts               # Encryption utils
    │   └── config.ts               # API URL config
    ├── components/                 # Reusable UI components
    └── package.json                # Dependencies (Expo 54, RN)
```

---

## 📡 API Reference

### Quick Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/register` | POST | Create new account |
| `/login` | POST | Get JWT token |
| `/me` | GET | Get user profile |
| `/me/public-key` | PUT | Update encryption key |
| `/messages/{username}` | GET | Fetch chat history |
| `/messages/{username}` | DELETE | Delete conversation |
| `/conversations` | GET | List all chats |
| `/users/{username}/keys` | GET | Get public keys |
| `/upload-file` | POST | Upload encrypted file |
| `/download-file/{id}` | GET | Download file |
| `/ws?token={jwt}` | WebSocket | Real-time messaging |

📖 **Full API documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## 🔐 Security

### Encryption Details
- **Algorithm:** NaCl Box (Curve25519-XSalsa20-Poly1305)
- **Key Size:** 256-bit encryption keys
- **Nonce:** 24-byte random nonce per message
- **Forward Secrecy:** Each message has unique nonce

### Key Management
1. **Key Generation:** Client generates keypair on first use
2. **Key Storage:** 
   - Web: `localStorage` (client-side only)
   - Mobile: `expo-secure-store` (hardware-backed encryption)
3. **Key Sync:** Public keys uploaded to server, private keys never leave device

### Password Security
- **Hashing:** bcrypt with automatic salt
- **Rounds:** 12 (secure default)
- **No plaintext storage**

### File Security
- **Upload validation:** File type whitelist
- **Blocked types:** `.exe`, `.bat`, `.sh`, `.app`, `.jar`, macros
- **Size limit:** Configurable per deployment
- **Encryption:** Files encrypted client-side before upload
- **Auto-cleanup:** Files deleted after 24 hours

---

## 🎯 Use Cases

- 💼 **Private business communication**
- 🏥 **Healthcare messaging** (HIPAA-compliant architecture)
- 🔐 **Personal encrypted chats**
- 📚 **Educational project** (learning E2EE and cryptography)
- 🌐 **Cross-platform messaging** demo

---

## 🔧 Configuration

### Environment Variables

**Backend `.env`:**
```env
SECRET_KEY=your-secret-key-here-use-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DATABASE_URL=mysql://user:pass@localhost/sandeshaa  # Optional
```

**Frontend `src/api.js`:**
```javascript
const apiClient = axios.create({
  baseURL: "http://127.0.0.1:8000",  // Change for production
});
```

**Mobile `src/config.ts`:**
```typescript
export const API_BASE_URL = "http://192.168.1.65:8000";  // Your local IP
```

> 💡 **Tip:** Use the `start-web.sh` script to start both backend and frontend at once!

---

## 🐛 Troubleshooting

### Common Issues

**❌ Backend won't start**
```bash
# Install MySQL connector
pip install pymysql cryptography

# Or use SQLite (dev only)
# Edit database.py: SQLALCHEMY_DATABASE_URL = "sqlite:///./sandeshaa.db"
```

**❌ Mobile app can't connect**
- Use your computer's **local IP** (not `localhost`)
- Check firewall allows port 8000
- Ensure phone and computer are on same WiFi network
- Update IP in `src/config.ts`, `app/chat.tsx`, and `app/chats.tsx`

**❌ Messages not encrypting**
- Check browser console for errors
- Verify keys generated (check localStorage)
- Ensure recipient's public key is fetched

**❌ WebSocket connection fails**
- Check JWT token is valid
- Ensure backend is running
- Verify CORS settings in `main.py`

---

## 📸 Screenshots

> 🚧 **Coming Soon**: Screenshots of Web and Mobile interfaces

---

## 🗺️ Roadmap

- [ ] Group chat support
- [ ] Voice/video calls (E2EE)
- [ ] Message reactions
- [ ] Push notifications
- [ ] Dark mode
- [ ] Message search
- [ ] Emoji picker
- [ ] Read receipts
- [ ] Typing indicators

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/awesome-feature
   ```
3. **Commit** your changes
   ```bash
   git commit -m "Add awesome feature"
   ```
4. **Push** to your branch
   ```bash
   git push origin feature/awesome-feature
   ```
5. **Open** a Pull Request

---

## 📄 License

This project is developed as part of a **7th Semester Computer Science Project** at [Your University].

**Author:** Himani Gaire

---

## 🙏 Acknowledgments

- [TweetNaCl.js](https://tweetnacl.js.org/) - Fast, secure, audited crypto library
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Expo](https://expo.dev/) - Amazing React Native tooling
- [React](https://react.dev/) - The library for web and native interfaces
- [Signal Protocol](https://signal.org/docs/) - Inspiration for E2EE design

---

## 📞 Contact & Support

- **Issues:** [GitHub Issues](https://github.com/himanigaire/Sandeshaa/issues)
- **Discussions:** [GitHub Discussions](https://github.com/himanigaire/Sandeshaa/discussions)

---

<div align="center">

**Built with ❤️ and 🔐**

*Privacy is not a crime. Encryption is not a weapon.*

</div>