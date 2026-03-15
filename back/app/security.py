from datetime import datetime, timedelta, timezone
from contextvars import ContextVar
from typing import Annotated

import bcrypt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.utils import get_authorization_scheme_param
from jose import JWTError, jwt
from sqlmodel import Session, select

from .db import get_session
from .models import User, Tenant, UserRole, Provider
from .settings import settings

# Context variable to store the current tenant_id for the request
_tenant_id_ctx = ContextVar("tenant_id", default=None)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


def get_tenant_id() -> int | None:
    return _tenant_id_ctx.get()


def set_tenant_id(tenant_id: int) -> None:
    _tenant_id_ctx.set(tenant_id)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Create a refresh token with longer expiry and 'refresh' type.
    Uses separate secret key for additional security.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(
        to_encode, settings.refresh_secret_key, algorithm=settings.algorithm
    )
    return encoded_jwt


async def get_token_from_cookie(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)]
) -> str:
    """
    Get token from cookie (primary) or Authorization header (fallback).
    """
    # Try getting from cookie first
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
        
    # Fallback to Authorization header (Bearer token)
    if token:
        return token
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


async def get_optional_token(
    request: Request,
    token: Annotated[str | None, Depends(oauth2_scheme)]
) -> str | None:
    """Return access token from cookie or header, or None if not present."""
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    return token


def _user_from_payload(session: Session, payload: dict) -> User | None:
    """Look up user from JWT payload (tenant_id or provider_id). Returns None if invalid."""
    email: str = payload.get("sub")
    tenant_id = payload.get("tenant_id")  # None for provider users
    provider_id = payload.get("provider_id")
    token_version: int = payload.get("token_version", 0)
    if email is None:
        return None
    if tenant_id is not None:
        set_tenant_id(tenant_id)
        statement = select(User).where(User.email == email).where(User.tenant_id == tenant_id)
    elif provider_id is not None:
        statement = select(User).where(User.email == email).where(User.provider_id == provider_id)
    else:
        return None
    user = session.exec(statement).first()
    if user is None or user.token_version != token_version:
        return None
    return user


async def get_current_user_optional(
    token: Annotated[str | None, Depends(get_optional_token)],
    session: Annotated[Session, Depends(get_session)],
) -> User | None:
    """Return current user if authenticated, else None. Use for endpoints that support both auth and anonymous."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return _user_from_payload(session, payload)
    except JWTError:
        return None


async def get_current_user(
    token: Annotated[str, Depends(get_token_from_cookie)],
    session: Annotated[Session, Depends(get_session)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user = _user_from_payload(session, payload)
        if user is None:
            raise credentials_exception
        return user
    except JWTError:
        raise credentials_exception


def validate_refresh_token(refresh_token: str, session: Session) -> User:
    """
    Validate a refresh token and return the associated user.
    Raises HTTPException if token is invalid, expired, or revoked.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
    )
    
    if not refresh_token:
        raise credentials_exception
    
    try:
        payload = jwt.decode(
            refresh_token, settings.refresh_secret_key, algorithms=[settings.algorithm]
        )
        if payload.get("type") != "refresh":
            raise credentials_exception
        user = _user_from_payload(session, payload)
        if user is None:
            raise credentials_exception
        return user
    except JWTError:
        raise credentials_exception


async def get_current_provider_user(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> tuple[User, Provider]:
    """Require that the current user is a provider; return (user, provider)."""
    if current_user.provider_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Provider account required",
        )
    provider = session.get(Provider, current_user.provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return (current_user, provider)
