# models.py
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)   # ✅ add length
    password_hash = Column(String(255), nullable=False)                      # ✅ add length
    identity_public_key = Column(Text, nullable=False)
    prekey_public = Column(Text, nullable=False)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ciphertext = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    delivered = Column(Boolean, default=False, nullable=False)


class FileMessage(Base):
    __tablename__ = "file_messages"

    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id"))
    to_user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String(255), nullable=False)          # ✅ add length
    stored_filename = Column(String(255), nullable=False)   # ✅ add length
    file_size = Column(Integer)
    file_type = Column(String(100))                         # ✅ add length
    created_at = Column(DateTime, default=datetime.now)

    from_user = relationship("User", foreign_keys=[from_user_id])
    to_user = relationship("User", foreign_keys=[to_user_id])
