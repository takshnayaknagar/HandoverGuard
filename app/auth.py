"""Password and server-managed session helpers for HandoverGuard."""

import hashlib
import secrets
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHash, VerificationError, VerifyMismatchError

from app.database import get_connection, initialize_database

PASSWORD_MIN_LENGTH = 12
PASSWORD_MAX_LENGTH = 256
SESSION_LIFETIME = timedelta(hours=8)
_PASSWORD_HASHER = PasswordHasher()


@contextmanager
def _connection():
    connection = get_connection()
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def normalize_staff_id(staff_id: str) -> str:
    """Return the canonical form used for account uniqueness."""
    if not isinstance(staff_id, str):
        raise ValueError("Staff ID must be text")
    normalized = staff_id.strip().casefold()
    if not normalized or len(normalized) > 128 or '@' in normalized or any(char.isspace() for char in normalized):
        raise ValueError("Staff ID must be non-empty and contain no spaces")
    return normalized


def validate_password(password: str) -> None:
    if not isinstance(password, str):
        raise ValueError("Password must be text")
    if not PASSWORD_MIN_LENGTH <= len(password) <= PASSWORD_MAX_LENGTH:
        raise ValueError(
            f"Password must contain between {PASSWORD_MIN_LENGTH} and {PASSWORD_MAX_LENGTH} characters"
        )


def hash_password(password: str) -> str:
    validate_password(password)
    return _PASSWORD_HASHER.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify safely, returning False for malformed or unsupported hashes."""
    if not isinstance(password, str) or not isinstance(stored_hash, str):
        return False
    try:
        return _PASSWORD_HASHER.verify(stored_hash, password)
    except (InvalidHash, VerificationError, VerifyMismatchError, ValueError):
        return False


def create_user(staff_id: str, password: str) -> str:
    """Create one active user; duplicate normalized Staff IDs are rejected."""
    normalized = normalize_staff_id(staff_id)
    password_hash = hash_password(password)
    user_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    initialize_database()
    try:
        with _connection() as connection:
            connection.execute(
                """
                INSERT INTO users (user_id, username, password_hash, created_at, is_active)
                VALUES (?, ?, ?, ?, 1)
                """,
                (user_id, normalized, password_hash, created_at),
            )
    except sqlite3.IntegrityError as error:
        if (
            error.sqlite_errorname == "SQLITE_CONSTRAINT_UNIQUE"
            and "users.username" in str(error)
        ):
            raise ValueError("An account with this Staff ID already exists") from error
        raise
    return user_id


def get_user_by_staff_id(staff_id: str) -> dict | None:
    normalized = normalize_staff_id(staff_id)
    initialize_database()
    with _connection() as connection:
        row = connection.execute(
            "SELECT user_id, username, password_hash, created_at, is_active FROM users WHERE username = ?",
            (normalized,),
        ).fetchone()
    return dict(row) if row else None


def remove_user_by_staff_id(staff_id: str) -> None:
    """Remove an account only when it owns no handovers."""
    if not isinstance(staff_id, str) or not staff_id.strip() or any(char.isspace() for char in staff_id.strip()):
        raise ValueError("Staff ID must be non-empty and contain no spaces")
    normalized = staff_id.strip().casefold()
    initialize_database()
    with _connection() as connection:
        row = connection.execute("SELECT user_id FROM users WHERE username = ?", (normalized,)).fetchone()
        if row is None:
            raise ValueError("No account exists for that Staff ID")
        owned = connection.execute("SELECT 1 FROM handovers WHERE owner_id = ? LIMIT 1", (row["user_id"],)).fetchone()
        if owned is not None:
            raise ValueError("Account owns saved handovers; deactivate it instead of deleting it")
        connection.execute("DELETE FROM users WHERE user_id = ?", (row["user_id"],))


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(user_id: str, lifetime: timedelta = SESSION_LIFETIME) -> tuple[str, datetime]:
    """Create a session and return the raw token once plus its expiry."""
    if not isinstance(user_id, str) or not user_id:
        raise ValueError("A user ID is required")
    if lifetime.total_seconds() <= 0:
        raise ValueError("Session lifetime must be positive")
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires_at = now + lifetime
    initialize_database()
    with _connection() as connection:
        user = connection.execute(
            "SELECT user_id FROM users WHERE user_id = ? AND is_active = 1", (user_id,)
        ).fetchone()
        if user is None:
            raise ValueError("Active user not found")
        connection.execute(
            """
            INSERT INTO sessions (session_id, token_hash, user_id, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), hash_session_token(token), user_id, now.isoformat(), expires_at.isoformat()),
        )
    return token, expires_at


def get_user_for_session(token: str) -> dict | None:
    if not isinstance(token, str) or not token:
        return None
    now = datetime.now(timezone.utc)
    initialize_database()
    with _connection() as connection:
        row = connection.execute(
            """
            SELECT u.user_id, u.username, u.created_at, u.is_active, s.expires_at
            FROM sessions AS s
            JOIN users AS u ON u.user_id = s.user_id
            WHERE s.token_hash = ? AND s.revoked_at IS NULL
            """,
            (hash_session_token(token),),
        ).fetchone()
    if row is None or not row["is_active"]:
        return None
    try:
        expires_at = datetime.fromisoformat(row["expires_at"])
    except (TypeError, ValueError):
        return None
    if expires_at <= now:
        return None
    return dict(row)


def revoke_session(token: str) -> bool:
    if not isinstance(token, str) or not token:
        return False
    revoked_at = datetime.now(timezone.utc).isoformat()
    initialize_database()
    with _connection() as connection:
        cursor = connection.execute(
            "UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
            (revoked_at, hash_session_token(token)),
        )
    return cursor.rowcount == 1
