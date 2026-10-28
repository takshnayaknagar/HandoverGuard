
import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

# Keep the database in a local data folder.
DATABASE_PATH = Path(
    os.getenv("HANDOVERGUARD_DB", "data/handovers.db")
)


def get_connection():
    """Open a connection and ensure the database folder exists."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def _connection():
    connection = get_connection()
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize_database():
    """Create the schema and apply repeatable, non-destructive migrations."""
    with _connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
            """
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                token_hash TEXT NOT NULL UNIQUE,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                revoked_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)"
        )

        connection.execute("""
            CREATE TABLE IF NOT EXISTS handovers (
                case_id TEXT PRIMARY KEY,
                owner_id TEXT REFERENCES users(user_id) ON DELETE RESTRICT,
                patient_reference TEXT,
                patient_bed TEXT,
                transcript TEXT NOT NULL,
                completed TEXT NOT NULL,
                pending TEXT NOT NULL,
                follow_up TEXT NOT NULL,
                communication TEXT NOT NULL,
                unclear_or_undocumented TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        handover_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(handovers)")
        }
        if "owner_id" not in handover_columns:
            # Existing rows receive NULL and remain legacy/unowned. They are
            # deliberately not assigned to the demo account by this migration.
            connection.execute(
                "ALTER TABLE handovers ADD COLUMN owner_id TEXT REFERENCES users(user_id) ON DELETE RESTRICT"
            )
        if "patient_bed" not in handover_columns:
            connection.execute("ALTER TABLE handovers ADD COLUMN patient_bed TEXT")

        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_handovers_owner_id ON handovers(owner_id)"
        )
        connection.execute(
            "INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)",
            (1, datetime.now(timezone.utc).isoformat()),
        )


def save_handover(transcript: str, handover: dict, owner_id: str) -> str:
    """Save a processed handover and return its unique case ID."""
    if not isinstance(owner_id, str) or not owner_id.strip():
        raise ValueError("A non-empty owner ID is required")
    case_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    with _connection() as connection:
        connection.execute(
            """
            INSERT INTO handovers (
                case_id, owner_id, patient_reference, patient_bed, transcript, completed,
                pending, follow_up, communication,
                unclear_or_undocumented, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                case_id,
                owner_id,
                handover.get("patient_reference"),
                handover.get("patient_bed"),
                transcript,
                json.dumps(handover.get("completed", [])),
                json.dumps(handover.get("pending", [])),
                json.dumps(handover.get("follow_up", [])),
                json.dumps(handover.get("communication", [])),
                json.dumps(handover.get("unclear_or_undocumented", [])),
                created_at,
            ),
        )

    return case_id


def list_handovers(owner_id: str) -> list[dict]:
    """Return this owner's saved cases, newest first."""
    if not isinstance(owner_id, str) or not owner_id.strip():
        raise ValueError("A non-empty owner ID is required")

    with _connection() as connection:
        rows = connection.execute(
            """
            SELECT case_id, patient_reference, patient_bed, created_at
            FROM handovers
            WHERE owner_id = ?
            ORDER BY created_at DESC
            """,
            (owner_id,),
        ).fetchall()

    return [dict(row) for row in rows]


def get_handover(case_id: str, owner_id: str) -> dict | None:
    """Retrieve a saved case, including its full handover."""
    if not isinstance(owner_id, str) or not owner_id.strip():
        raise ValueError("A non-empty owner ID is required")

    with _connection() as connection:
        row = connection.execute(
            "SELECT * FROM handovers WHERE case_id = ? AND owner_id = ?",
            (case_id, owner_id),
        ).fetchone()

    if row is None:
        return None

    result = dict(row)
    for field in (
        "completed",
        "pending",
        "follow_up",
        "communication",
        "unclear_or_undocumented",
    ):
        result[field] = json.loads(result[field])

    return result

def delete_handover(case_id: str, owner_id: str) -> bool:
    """Delete a saved handover by case ID.

    Returns True if a handover was deleted, otherwise False.
    """
    if not isinstance(owner_id, str) or not owner_id.strip():
        raise ValueError("A non-empty owner ID is required")

    with _connection() as connection:
        cursor = connection.execute(
            "DELETE FROM handovers WHERE case_id = ? AND owner_id = ?",
            (case_id, owner_id),
        )
    return cursor.rowcount > 0
