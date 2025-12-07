# main.py
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, File, UploadFile, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
import atexit 
from jose import JWTError, jwt
from typing import Dict
import os
import shutil
import mimetypes
from pathlib import Path

from database import Base, engine, SessionLocal
import models
import auth
from schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    PublicKeysResponse,
    UserInfoResponse,
)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sandeshaa Backend (Prototype)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP Bearer auth for JWT tokens (Authorization: Bearer <token>)
security = HTTPBearer()

# In-memory mapping of user_id -> WebSocket connection
active_connections: Dict[int, WebSocket] = {}


# DB session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Get current user from JWT token
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.User:
    token = credentials.credentials
    print(f"🔍 Token received: {token[:30]}...")

    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        print(f"✅ Decoded payload: {payload}")
        user_id = payload.get("sub")
        print(f"👤 Looking for user_id: {user_id}")
        if user_id is None:
            raise cred_exc
        user_id = int(user_id) # Convert user_id to integer
    except JWTError as e:
        print(f"❌ JWT Error: {e}")
        raise cred_exc

    user = db.query(models.User).filter(models.User.id == user_id).first()
    print(f"🔎 Found user: {user}")
    if user is None:
        raise cred_exc

    return user

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed file types (whitelist approach - SAFER!)
ALLOWED_EXTENSIONS = {
    # Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg',
    # Documents
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
    # Spreadsheets
    '.xls', '.xlsx', '.csv', '.ods',
    # Presentations
    '.ppt', '.pptx', '.odp',
    # Archives
    '.zip', '.rar', '.7z',
    # Media
    '.mp3', '.mp4', '.wav', '.avi', '.mov',
}

# DANGEROUS file types (blacklist - BLOCKED!)
BLOCKED_EXTENSIONS = {
    '.exe', '.dll', '.bat', '.cmd', '.com', '.scr', '.msi',
    '.sh', '.bash', '.ps1', '.vbs', '.js', '.jse',
    '.iso', '.img', '.jar', '.apk', '.deb', '.rpm',
    '.xlsm', '.docm', '.pptm',
}

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

def validate_file(file: UploadFile) -> tuple[bool, str]:
    """Validate uploaded file for security"""
    filename_lower = file.filename.lower()
    file_ext = os.path.splitext(filename_lower)[1]
    
    # Check 1: Block dangerous extensions
    if file_ext in BLOCKED_EXTENSIONS:
        return False, f"File type '{file_ext}' is not allowed for security reasons"
    
    # Check 2: Only allow whitelisted extensions
    if file_ext not in ALLOWED_EXTENSIONS:
        return False, f"File type '{file_ext}' is not supported"
    
    # Check 3: Check file size
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        size_mb = file_size / (1024 * 1024)
        return False, f"File too large ({size_mb:.1f}MB). Maximum: {MAX_FILE_SIZE / (1024 * 1024)}MB"
    
    if file_size == 0:
        return False, "File is empty"
    
    # Check 4: Validate filename
    suspicious_patterns = ['..', '/', '\\', '\0', '<', '>', '|', '*', '?']
    if any(pattern in file.filename for pattern in suspicious_patterns):
        return False, "Invalid characters in filename"
    
    return True, "OK"

# ----------------- BASIC TEST ENDPOINTS ----------------- #

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Sandeshaa backend running"}


@app.get("/debug/users-count")
def get_users_count(db: Session = Depends(get_db)):
    count = db.query(models.User).count()
    return {"users_count": count}


# ----------------- AUTH & USER ENDPOINTS ----------------- #

@app.post("/register", response_model=UserInfoResponse)
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Create a new user with:
    - username
    - password (hashed)
    - identity_public_key
    - prekey_public
    """
    # Check if username already exists
    existing = db.query(models.User).filter(models.User.username == req.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    hashed_password = auth.get_password_hash(req.password)

    user = models.User(
        username=req.username,
        password_hash=hashed_password,
        identity_public_key=req.identity_public_key,
        prekey_public=req.prekey_public,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return UserInfoResponse(id=user.id, username=user.username)


@app.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Log in a user by username + password and return a JWT token.
    """
    user = db.query(models.User).filter(models.User.username == req.username).first()

    if not user or not auth.verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Store user.id as "sub" in token
    token = auth.create_access_token({"sub": str(user.id)})#This line is changed to string 

    return TokenResponse(access_token=token)


@app.get("/me", response_model=UserInfoResponse)
def read_me(current_user: models.User = Depends(get_current_user)):
    """
    Return the current logged-in user's basic info.
    Protected by JWT.
    """
    return UserInfoResponse(id=current_user.id, username=current_user.username)


@app.get("/users/{username}/keys", response_model=PublicKeysResponse)
def get_user_keys(username: str, db: Session = Depends(get_db)):
    """
    Return the identity_public_key and prekey_public for a given username.
    Anyone can call this (no auth required), since keys are public.
    """
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return PublicKeysResponse(
        username=user.username,
        identity_public_key=user.identity_public_key,
        prekey_public=user.prekey_public,
    )

@app.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    to_username: str = Form(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload encrypted file with security validation"""
    
    # Validate file
    is_valid, error_msg = validate_file(file)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    try:
        # Sanitize filename
        safe_filename = os.path.basename(file.filename)
        safe_filename = "".join(c for c in safe_filename if c.isalnum() or c in '._- ')
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = os.urandom(8).hex()
        file_ext = os.path.splitext(safe_filename)[1]
        stored_filename = f"{timestamp}_{unique_id}{file_ext}"
        file_path = UPLOAD_DIR / stored_filename
        
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get recipient
        recipient = db.query(models.User).filter(
            models.User.username == to_username
        ).first()
        
        if not recipient:
            os.remove(file_path)
            raise HTTPException(status_code=404, detail="Recipient not found")
        
        # Create database record
        file_message = models.FileMessage(
            from_user_id=current_user.id,  # treating as object
            to_user_id=recipient.id,
            filename=safe_filename,
            stored_filename=stored_filename,
            file_size=os.path.getsize(file_path),
            file_type=file.content_type,
            created_at=datetime.now()
        )
        
        db.add(file_message)
        db.commit()
        db.refresh(file_message)
        
        return {
            "message": "File uploaded successfully",
            "file_id": file_message.id,
            "filename": safe_filename,
            "file_size": file_message.file_size,
            "file_type": file.content_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading file: {e}")
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail="File upload failed")


@app.get("/download-file/{file_id}")
async def download_file(
    file_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download encrypted file"""
    file_message = db.query(models.FileMessage).filter(
        models.FileMessage.id == file_id
    ).first()
    
    if not file_message:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check authorization
    if file_message.to_user_id != current_user.id and file_message.from_user_id != current_user.id:  # NEW
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    file_path = UPLOAD_DIR / file_message.stored_filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File no longer available")
    
    return FileResponse(
        path=file_path,
        filename=file_message.filename,
        media_type="application/octet-stream"
    )

# ----------------- WEBSOCKET CHAT ENDPOINT ----------------- #

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    """
    WebSocket endpoint for real-time chat.

    Clients connect with:
      ws://127.0.0.1:8000/ws?token=YOUR_JWT_HERE

    After connecting, the server:
    - Authenticates the user via the JWT token
    - Sends any undelivered messages
    - Listens for "send_message" events to route ciphertext messages
    """
    # Accept connection first
    await websocket.accept()

    if token is None:
        await websocket.send_json({"type": "error", "message": "Missing token"})
        await websocket.close()
        return

    db = SessionLocal()
    try:
        # Decode and validate token
        try:
            payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
            user_id = payload.get("sub")
            if user_id is None:
                raise JWTError()
            # ensure int
            user_id = int(user_id)
        except JWTError:
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            await websocket.close()
            return

        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user is None:
            await websocket.send_json({"type": "error", "message": "User not found"})
            await websocket.close()
            return

        # Register active connection
        active_connections[user.id] = websocket

        # --- Send any undelivered messages for this user ---
        undelivered = (
            db.query(models.Message)
            .filter(
                models.Message.to_user_id == user.id,
                models.Message.delivered == False,
            )
            .order_by(models.Message.created_at.asc())
            .all()
        )

        for msg in undelivered:
            from_user = (
                db.query(models.User)
                .filter(models.User.id == msg.from_user_id)
                .first()
            )
            await websocket.send_json(
                {
                    "type": "message",
                    "id": msg.id,
                    "from": from_user.username if from_user else None,
                    "ciphertext": msg.ciphertext,
                    "created_at": msg.created_at.isoformat()
                    if msg.created_at
                    else None,
                }
            )
            msg.delivered = True

        db.commit()

        # --- Main receive loop for this WebSocket connection ---
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "send_message":
                to_username = data.get("to")
                ciphertext = data.get("ciphertext")

                if not to_username or not ciphertext:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": "Missing 'to' or 'ciphertext' in send_message",
                        }
                    )
                    continue

                # Find recipient user
                to_user = (
                    db.query(models.User)
                    .filter(models.User.username == to_username)
                    .first()
                )
                if not to_user:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": f"Recipient '{to_username}' not found",
                        }
                    )
                    continue

                # Save message in DB (encrypted ciphertext only)
                new_msg = models.Message(
                    from_user_id=user.id,
                    to_user_id=to_user.id,
                    ciphertext=ciphertext,
                )

                db.add(new_msg)
                db.commit()
                db.refresh(new_msg)

                # Try to deliver in real-time if recipient is online
                recipient_ws = active_connections.get(to_user.id)
                if recipient_ws:
                    try:
                        await recipient_ws.send_json(
                            {
                                "type": "message",
                                "id": new_msg.id,
                                "from": user.username,
                                "ciphertext": new_msg.ciphertext,
                                "created_at": new_msg.created_at.isoformat()
                                if new_msg.created_at
                                else None,
                            }
                        )
                        new_msg.delivered = True
                        db.commit()
                    except Exception:
                        # If sending to recipient fails, keep it undelivered;
                        # they'll fetch it next time they connect.
                        pass

                # Acknowledge to sender
                await websocket.send_json(
                    {
                        "type": "sent",
                        "id": new_msg.id,
                        "to": to_username,
                        "delivered": new_msg.delivered,
                    }
                )

            else:
                # Unknown message type
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": f"Unknown message type: {msg_type}",
                    }
                )

    except WebSocketDisconnect:
        # Remove connection on disconnect
        for uid, ws in list(active_connections.items()):
            if ws is websocket:
                del active_connections[uid]
                break
    finally:
        db.close()

# ----------------- AUTO-CLEANUP SCHEDULER ----------------- #
 # Auto-delete messages older than 7 days
def cleanup_old_messages():
    """Delete messages older than 7 days"""
    db = SessionLocal()
    try:
        cutoff_date = datetime.now() - timedelta(days=7)
        deleted_count = db.query(models.Message).filter(
            models.Message.created_at < cutoff_date
        ).delete()
        db.commit()
        
        if deleted_count > 0:
            print(f"✅ [AUTO-CLEANUP] Deleted {deleted_count} messages older than 7 days")
        else:
            print(f"ℹ️  [AUTO-CLEANUP] No old messages to delete")
            
    except Exception as e:
        print(f"❌ [CLEANUP ERROR] {e}")
        db.rollback()
    finally:
        db.close()

# Auto-delete files older than 24 hours
def cleanup_old_files():
    """Delete files older than 24 hours"""
    db = SessionLocal()
    try:
        cutoff = datetime.now() - timedelta(hours=24)
        
        # Get old files
        old_files = db.query(models.FileMessage).filter(
            models.FileMessage.created_at < cutoff
        ).all()
        
        # Delete physical files
        deleted_count = 0
        for file_msg in old_files:
            file_path = UPLOAD_DIR / file_msg.stored_filename
            if file_path.exists():
                os.remove(file_path)
                deleted_count += 1
        
        # Delete database records
        db.query(models.FileMessage).filter(
            models.FileMessage.created_at < cutoff
        ).delete()
        
        db.commit()
        
        if deleted_count > 0:
            print(f"✅ [FILE CLEANUP] Deleted {deleted_count} files older than 24 hours")
        else:
            print(f"ℹ️  [FILE CLEANUP] No old files to delete")
            
    except Exception as e:
        print(f"❌ [FILE CLEANUP ERROR] {e}")
        db.rollback()
    finally:
        db.close()

# Initialize scheduler
scheduler = BackgroundScheduler()

# Run message cleanup daily at 3:00 AM
scheduler.add_job(cleanup_old_messages, 'cron', hour=3, minute=0, id='daily_cleanup')

# Run file cleanup daily at 3:30 AM
scheduler.add_job(cleanup_old_files, 'cron', hour=3, minute=30, id='file_cleanup')

# Run both on startup
scheduler.add_job(cleanup_old_messages, id='startup_cleanup')
scheduler.add_job(cleanup_old_files, id='startup_file_cleanup')

# Start scheduler
scheduler.start()

# Shutdown gracefully
atexit.register(lambda: scheduler.shutdown())

print("✅ Auto-cleanup scheduler started (messages: 7 days, files: 24 hours)")