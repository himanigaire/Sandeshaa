# 🚀 Sandeshaa API Documentation

**Sandeshaa** (संदेशा - meaning "message" in Nepali) is a secure, end-to-end encrypted messaging application API built with FastAPI. This document provides comprehensive information about all available API endpoints, authentication, and usage examples.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Base URL](#-base-url)
- [Authentication](#-authentication)
- [Data Models](#-data-models)
- [Error Handling](#-error-handling)
- [API Endpoints](#-api-endpoints)
  - [Health Check](#health-check)
  - [Authentication & User Management](#authentication--user-management)
  - [Public Key Management](#public-key-management)
  - [Messaging](#messaging)
  - [File Management](#file-management)
  - [WebSocket Connection](#websocket-connection)
- [Rate Limiting & Security](#-rate-limiting--security)
- [Client Libraries](#-client-libraries)

---

## 🌟 Overview

The Sandeshaa API provides secure messaging capabilities with end-to-end encryption using NaCl (TweetNaCl) cryptography. The API handles:

- **User Registration & Authentication** - JWT-based secure authentication
- **Public Key Exchange** - Automatic public key synchronization for E2EE
- **Message Routing** - Encrypted message delivery via REST and WebSocket
- **File Sharing** - Secure encrypted file upload/download with validation
- **Real-time Communication** - WebSocket-based instant message delivery

**Key Security Features:**
- End-to-end encryption (messages stored as ciphertext only)
- JWT authentication with Bearer tokens
- File validation and sanitization
- Automatic message cleanup (7 days)
- Automatic file cleanup (24 hours)

---

## 🔗 Base URL

```
http://127.0.0.1:8000
```

**CORS Configuration:** 
- Allowed Origins: `http://localhost:5173`, `http://localhost:5174`, `http://127.0.0.1:5173`, `http://127.0.0.1:5174`
- Supports all HTTP methods and headers

---

## 🔐 Authentication

The API uses **JWT (JSON Web Tokens)** for authentication with the Bearer token scheme.

### Token Format
```
Authorization: Bearer <jwt_token>
```

### Token Payload
```json
{
  "sub": "user_id",
  "exp": 1640995200
}
```

### Token Expiry
- **Access Token Lifetime:** 24 hours (1440 minutes)
- **Algorithm:** HS256
- **Refresh:** Not implemented (re-login required after expiry)

---

## 📊 Data Models

### User Model
```python
class User:
    id: int                      # Primary key
    username: str               # Unique username (max 50 chars)
    password_hash: str          # Bcrypt hashed password (max 255 chars)
    identity_public_key: str    # NaCl public key for identity
    prekey_public: str          # NaCl prekey for initial exchange
```

### Message Model
```python
class Message:
    id: int                     # Primary key
    from_user_id: int          # Sender's user ID
    to_user_id: int            # Recipient's user ID
    ciphertext: str            # Encrypted message content
    created_at: datetime       # Message timestamp
    delivered: bool            # Delivery status
```

### FileMessage Model
```python
class FileMessage:
    id: int                    # Primary key
    from_user_id: int         # Sender's user ID
    to_user_id: int           # Recipient's user ID
    filename: str             # Original filename
    stored_filename: str      # Server storage filename
    file_size: int            # File size in bytes
    file_type: str            # MIME type
    created_at: datetime      # Upload timestamp
```

---

## ⚠️ Error Handling

### Standard HTTP Status Codes
- **200** - Success
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (invalid/missing token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found (resource doesn't exist)
- **500** - Internal Server Error

### Error Response Format
```json
{
  "detail": "Error message description"
}
```

---

## 📡 API Endpoints

## Health Check

### `GET /`
**Description:** Basic health check endpoint.

**Authentication:** None required

**Response:**
```json
{
  "status": "ok",
  "message": "Sandeshaa backend running"
}
```

### `GET /debug/users-count`
**Description:** Get total number of registered users.

**Authentication:** None required

**Response:**
```json
{
  "users_count": 42
}
```

---

## Authentication & User Management

### `POST /register`
**Description:** Register a new user with public keys for E2EE.

**Authentication:** None required

**Request Body:**
```json
{
  "username": "alice",
  "password": "secure_password_123",
  "identity_public_key": "base64_encoded_nacl_public_key",
  "prekey_public": "base64_encoded_nacl_prekey"
}
```

**Response (201):**
```json
{
  "id": 1,
  "username": "alice"
}
```

**Errors:**
- **400** - Username already taken

---

### `POST /login`
**Description:** Authenticate user and receive JWT token.

**Authentication:** None required

**Request Body:**
```json
{
  "username": "alice",
  "password": "secure_password_123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errors:**
- **401** - Invalid username or password

---

### `GET /me`
**Description:** Get current authenticated user's information.

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "id": 1,
  "username": "alice"
}
```

**Errors:**
- **401** - Invalid or missing token

---

## Public Key Management

### `GET /users/{username}/keys`
**Description:** Get public keys for a specific user (for E2EE key exchange).

**Authentication:** None required (public keys are public)

**Path Parameters:**
- `username` (string) - Target username

**Response (200):**
```json
{
  "username": "bob",
  "identity_public_key": "base64_encoded_nacl_public_key",
  "prekey_public": "base64_encoded_nacl_prekey"
}
```

**Errors:**
- **404** - User not found

---

### `PUT /me/public-key`
**Description:** Update current user's identity public key (for key rotation/device sync).

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "identity_public_key": "new_base64_encoded_nacl_public_key"
}
```

**Response (200):**
```json
{
  "status": "ok",
  "message": "Public key updated"
}
```

**Note:** This also updates the `prekey_public` to keep them in sync.

---

## Messaging

### `GET /conversations`
**Description:** Get list of all users you've exchanged messages with, sorted by most recent activity.

**Authentication:** Required (Bearer token)

**Response (200):**
```json
[
  {
    "username": "bob",
    "last_message_time": "2024-01-12T15:30:00.123456"
  },
  {
    "username": "charlie",
    "last_message_time": "2024-01-11T09:15:30.789012"
  }
]
```

---

### `GET /messages/{other_username}`
**Description:** Retrieve message history with a specific user (last 100 messages).

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `other_username` (string) - Username of the other participant

**Response (200):**
```json
[
  {
    "id": 123,
    "from_user_id": 1,
    "to_user_id": 2,
    "ciphertext": "encrypted_message_content_base64",
    "created_at": "2024-01-12T15:30:00.123456"
  },
  {
    "id": 122,
    "from_user_id": 2,
    "to_user_id": 1,
    "ciphertext": "another_encrypted_message_base64",
    "created_at": "2024-01-12T15:29:45.987654"
  }
]
```

**Note:** Messages are returned in descending order (newest first) and contain only encrypted ciphertext.

**Errors:**
- **404** - User not found

---

### `DELETE /messages/{username}`
**Description:** Delete all message history with a specific user.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `username` (string) - Username of the conversation to delete

**Response (200):**
```json
{
  "status": "ok",
  "message": "Deleted 15 messages",
  "deleted_count": 15
}
```

**Errors:**
- **404** - User not found

---

## File Management

### `POST /upload-file`
**Description:** Upload an encrypted file to send to another user.

**Authentication:** Required (Bearer token)

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (file) - The encrypted file to upload
- `to_username` (string) - Recipient's username

**File Restrictions:**
- **Max Size:** 10MB
- **Allowed Extensions:** 
  - Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`, `.svg`
  - Documents: `.pdf`, `.doc`, `.docx`, `.txt`, `.rtf`, `.odt`
  - Spreadsheets: `.xls`, `.xlsx`, `.csv`, `.ods`
  - Presentations: `.ppt`, `.pptx`, `.odp`
  - Archives: `.zip`, `.rar`, `.7z`
  - Media: `.mp3`, `.mp4`, `.wav`, `.avi`, `.mov`
- **Blocked Extensions:** `.exe`, `.dll`, `.bat`, `.cmd`, `.com`, `.scr`, `.msi`, `.sh`, `.bash`, `.ps1`, `.vbs`, `.js`, `.jse`, `.iso`, `.img`, `.jar`, `.apk`, `.deb`, `.rpm`, `.xlsm`, `.docm`, `.pptm`

**Response (200):**
```json
{
  "message": "File uploaded successfully",
  "file_id": 456,
  "filename": "document.pdf",
  "file_size": 2048576,
  "file_type": "application/pdf"
}
```

**Errors:**
- **400** - File validation failed (size, type, security)
- **404** - Recipient not found
- **500** - Upload failed

---

### `GET /download-file/{file_id}`
**Description:** Download a previously uploaded file.

**Authentication:** Required (Bearer token)

**Path Parameters:**
- `file_id` (integer) - File ID from upload response

**Response (200):** 
- **Content-Type:** `application/octet-stream`
- **Body:** Binary file content
- **Headers:** 
  - `Content-Disposition: attachment; filename="original_filename.ext"`

**Authorization:** Only sender or recipient can download the file.

**Errors:**
- **403** - Unauthorized (not sender or recipient)
- **404** - File not found or no longer available

---

## WebSocket Connection

### `WS /ws?token={jwt_token}`
**Description:** Real-time messaging via WebSocket connection.

**Authentication:** JWT token via query parameter

**Connection URL:**
```
ws://127.0.0.1:8000/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Connection Flow

1. **Connect** with JWT token
2. **Authentication** - Server validates token
3. **Undelivered Messages** - Server sends any pending messages
4. **Real-time Messaging** - Send/receive messages instantly

### Message Types

#### Client → Server: Send Message
```json
{
  "type": "send_message",
  "client_id": "unique_client_message_id",
  "to": "recipient_username",
  "ciphertext": "encrypted_message_content"
}
```

#### Server → Client: Incoming Message
```json
{
  "type": "message",
  "id": 789,
  "from": "sender_username",
  "ciphertext": "encrypted_message_content",
  "created_at": "2024-01-12T15:30:00.123456"
}
```

#### Server → Client: Send Confirmation
```json
{
  "type": "sent",
  "id": 789,
  "to": "recipient_username",
  "delivered": true,
  "client_id": "unique_client_message_id"
}
```

#### Server → Client: File Message Notification
```json
{
  "type": "file_message",
  "id": 456,
  "from": "sender_username",
  "file_id": 456,
  "filename": "document.pdf",
  "file_size": 2048576,
  "file_type": "application/pdf",
  "created_at": "2024-01-12T15:30:00.123456"
}
```

#### Server → Client: Error
```json
{
  "type": "error",
  "message": "Error description"
}
```

### Connection Management

- **Active Connections:** Server maintains mapping of `user_id → WebSocket`
- **Undelivered Messages:** Automatically sent when user comes online
- **Message Persistence:** Messages saved in database regardless of delivery status
- **Graceful Disconnection:** Connection cleaned up on disconnect

---

## 🛡️ Rate Limiting & Security

### Security Features

1. **Password Security:**
   - Bcrypt hashing with salt
   - Password truncation to 72 bytes (bcrypt limit)

2. **File Upload Security:**
   - Extension whitelist/blacklist validation
   - File size limits (10MB max)
   - Filename sanitization
   - Content-type validation (commented out but available)
   - Magic byte validation (commented out but available)

3. **JWT Security:**
   - HS256 signing algorithm
   - 24-hour expiration
   - Secure secret key

4. **Database Security:**
   - SQL injection prevention via ORM
   - Foreign key constraints
   - Input validation via Pydantic

### Automatic Cleanup

1. **Message Cleanup:**
   - **Frequency:** Daily at 3:00 AM
   - **Retention:** 7 days
   - **Also runs:** On server startup

2. **File Cleanup:**
   - **Frequency:** Daily at 3:30 AM  
   - **Retention:** 24 hours
   - **Also runs:** On server startup

---

## 📚 Client Libraries

### Frontend (React/JavaScript)

```javascript
import { registerUser, loginUser, getMe, getUserKeys, filesAPI } from './api.js';

// Authentication
const user = await registerUser({
  username: "alice",
  password: "password123",
  identityPublicKey: "base64_key",
  prekeyPublic: "base64_prekey"
});

const { access_token } = await loginUser({
  username: "alice", 
  password: "password123"
});

// File operations
const fileUpload = await filesAPI.uploadFile(file, "bob", token);
const fileBlob = await filesAPI.downloadFile(fileId, token);
```

### Mobile (React Native/TypeScript)

```typescript
import { apiPost, apiGetAuth, uploadFile, downloadFile } from './api';

// Authentication
const tokenResponse = await apiPost("/login", {
  username: "alice",
  password: "password123"
});

// File operations  
const uploadResult = await uploadFile(fileUri, fileName, "bob", token);
const fileBlob = await downloadFile(fileId, token);
```

### WebSocket Usage

```javascript
const ws = new WebSocket(`ws://127.0.0.1:8000/ws?token=${token}`);

ws.onopen = () => {
  console.log('Connected to Sandeshaa');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'message') {
    // Handle incoming message
    console.log(`Message from ${data.from}: ${data.ciphertext}`);
  }
};

// Send message
ws.send(JSON.stringify({
  type: "send_message",
  client_id: "msg_123",
  to: "bob",
  ciphertext: "encrypted_content"
}));
```

---

## 🔧 Configuration

### Environment Variables

- `DATABASE_URL` - Database connection string (required)
- `SECRET_KEY` - JWT signing secret (currently hardcoded)

### Default Settings

- **JWT Expiry:** 24 hours
- **Max File Size:** 10MB  
- **Message Retention:** 7 days
- **File Retention:** 24 hours
- **CORS Origins:** localhost:5173, localhost:5174
- **Upload Directory:** `./uploads/`

---

## 📝 Notes

1. **End-to-End Encryption:** All messages are stored as ciphertext. The server never has access to plaintext content.

2. **Key Management:** Public keys are stored on the server for key exchange, but private keys never leave the client device.

3. **Message Delivery:** Messages are delivered in real-time if recipient is online, otherwise stored for later delivery.

4. **File Security:** Files undergo extensive validation but are stored as uploaded (encrypted by client).

5. **Scalability:** Current implementation uses in-memory WebSocket connection tracking, which limits horizontal scaling.

---

**Last Updated:** January 12, 2026
**API Version:** 1.0.0
**Backend Framework:** FastAPI
**Database:** SQLAlchemy + PostgreSQL/SQLite