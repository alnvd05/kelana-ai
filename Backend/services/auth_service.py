import os
from datetime import datetime, timedelta, timezone

import bcrypt
from dotenv import load_dotenv
from jose import JWTError, jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models.user import User

load_dotenv()

JWT_ALGORITHM = "HS256"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = os.getenv(
    "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
    "30",
)


class EmailAlreadyRegisteredError(ValueError):
    """Raised when registration uses an email that already belongs to a user."""


class InvalidCredentialsError(ValueError):
    """Raised when an email and password pair cannot be authenticated."""


class InvalidTokenError(ValueError):
    """Raised when an access token is missing valid identity claims."""


def hash_password(password: str) -> str:
    """Hash a password with a unique bcrypt salt."""
    password_bytes = password.encode("utf-8")

    # bcrypt only accepts passwords up to 72 bytes. Validate bytes rather than
    # characters because non-ASCII characters can use more than one byte.
    if len(password_bytes) > 72:
        raise ValueError("Password must not exceed 72 bytes")

    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Return whether a password matches a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except ValueError:
        return False


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Authenticate an active user without revealing which credential failed."""
    normalized_email = email.strip().lower()
    user = (
        db.query(User)
        .filter(
            User.email == normalized_email,
            User.is_deleted.is_(False),
        )
        .first()
    )

    if user is None or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError("Invalid email or password")

    return user


def _get_jwt_secret() -> str:
    if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
        raise RuntimeError("JWT_SECRET_KEY must contain at least 32 characters")
    return JWT_SECRET_KEY


def create_access_token(user_id: int, expires_delta: timedelta | None = None) -> str:
    """Create a signed, short-lived JWT whose subject is the user ID."""
    now = datetime.now(timezone.utc)
    if expires_delta is None:
        try:
            expiry_minutes = int(JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        except ValueError as exc:
            raise RuntimeError(
                "JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be an integer"
            ) from exc
        expires_delta = timedelta(minutes=expiry_minutes)

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int:
    """Verify a JWT and return its integer user ID subject."""
    try:
        payload = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[JWT_ALGORITHM],
        )
        subject = payload.get("sub")
        if subject is None:
            raise InvalidTokenError("Token does not contain a subject")
        user_id = int(subject)
        if user_id <= 0:
            raise InvalidTokenError("Token subject is invalid")
        return user_id
    except (JWTError, TypeError, ValueError) as exc:
        raise InvalidTokenError("Invalid or expired access token") from exc


def register_user(db: Session, name: str, email: str, password: str) -> User:
    """Create a user with a normalized email and a bcrypt password hash."""
    normalized_email = email.strip().lower()
    normalized_name = name.strip()

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user is not None:
        raise EmailAlreadyRegisteredError("Email is already registered")

    user = User(
        name=normalized_name,
        email=normalized_email,
        password_hash=hash_password(password),
    )
    db.add(user)

    try:
        # Flush first so a database-generated ID is available for self-audit.
        db.flush()
        user.created_by = user.id
        user.updated_by = user.id
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        # The database UNIQUE constraint is the final protection against two
        # simultaneous requests registering the same email.
        db.rollback()
        raise EmailAlreadyRegisteredError("Email is already registered") from exc

    return user
