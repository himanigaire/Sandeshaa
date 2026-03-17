# auth.py
from datetime import datetime, timedelta
from typing import Optional

from jose import jwt
import bcrypt
import os

SECRET_KEY = os.getenv("SECRET_KEY", "XnBzj8X-d-Nns70kz62RCbxbeQk0lRds3SOwPKTLsAA")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 1 day

def get_password_hash(password: str) -> str:
    """Hash a plain password using bcrypt (max 72 bytes)."""
    password_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the stored bcrypt hash."""
    password_bytes = plain_password.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT token with an expiry."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
