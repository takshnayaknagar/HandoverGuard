
import json
import os
import sqlite3
import uuid
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
    return connection


def initialize_database():
    """Create the cases table if it doesn't already exist."""
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS handovers (
                case_id TEXT PRIMARY KEY,
                patient_reference TEXT,
                transcript TEXT NOT NULL,
                completed TEXT NOT NULL,
                pending TEXT NOT NULL,
                follow_up TEXT NOT NULL,
                communication TEXT NOT NULL,
                unclear_or_undocumented TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)


def save_handover(transcript: str, handover: dict) -> str:
    """Save a processed handover and return its unique case ID."""
    case_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO handovers (
                case_id, patient_reference, transcript, completed,
                pending, follow_up, communication,
                unclear_or_undocumented, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                case_id,
                handover.get("patient_reference"),
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


def list_handovers() -> list[dict]:
    """Return saved cases, newest first."""
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT case_id, patient_reference, created_at
            FROM handovers
            ORDER BY created_at DESC
            """
        ).fetchall()

    return [dict(row) for row in rows]


def get_handover(case_id: str) -> dict | None:
    """Retrieve a saved case, including its full handover."""
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM handovers WHERE case_id = ?",
            (case_id,),
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
