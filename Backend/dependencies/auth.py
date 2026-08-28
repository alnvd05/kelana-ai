from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database import SessionLocal
from models.user import User
from services.auth_service import InvalidTokenError, decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    """Resolve the active user represented by a valid Bearer JWT."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    try:
        user_id = decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise _unauthorized() from exc

    db = SessionLocal()
    try:
        user = (
            db.query(User)
            .filter(
                User.id == user_id,
                User.is_deleted.is_(False),
            )
            .first()
        )
        if user is None:
            raise _unauthorized()
        return user
    finally:
        db.close()
