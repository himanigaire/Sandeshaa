# schemas.py
from pydantic import BaseModel


class RegisterRequest(BaseModel):
    username: str
    password: str
    identity_public_key: str
    prekey_public: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PublicKeysResponse(BaseModel):
    username: str
    identity_public_key: str
    prekey_public: str


class UserInfoResponse(BaseModel):
    id: int
    username: str


class UpdatePublicKeyRequest(BaseModel):
    identity_public_key: str

class UpdatePublicKeyRequest(BaseModel):
    identity_public_key: str