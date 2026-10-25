"""Focused tests for the authentication schema migration."""

import sqlite3

import app.database as database


def _legacy_database(path):
    connection = sqlite3.connect(path)
    connection.execute(
        """
        CREATE TABLE handovers (
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
        """
    )
    connection.execute(
        """
        INSERT INTO handovers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        ("legacy-1", None, "synthetic legacy note", "[]", "[]", "[]", "[]", "[]", "2026-01-01T00:00:00+00:00"),
    )
    connection.commit()
    connection.close()


def test_initialization_preserves_legacy_records_as_unowned(tmp_path, monkeypatch):
    database_path = tmp_path / "handovers.db"
    _legacy_database(database_path)
    monkeypatch.setattr(database, "DATABASE_PATH", database_path)

    database.initialize_database()
    database.initialize_database()

    with database._connection() as connection:
        legacy = connection.execute(
            "SELECT case_id, owner_id, transcript FROM handovers WHERE case_id = ?",
            ("legacy-1",),
        ).fetchone()
        assert legacy["case_id"] == "legacy-1"
        assert legacy["owner_id"] is None
        assert legacy["transcript"] == "synthetic legacy note"

        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            )
        }
        assert {"schema_migrations", "users", "sessions", "handovers"} <= tables

        migration = connection.execute(
            "SELECT version FROM schema_migrations WHERE version = 1"
        ).fetchone()
        assert migration is not None




def test_new_handover_owner_is_nullable_until_auth_stage(tmp_path, monkeypatch):
    database_path = tmp_path / "handovers.db"
    monkeypatch.setattr(database, "DATABASE_PATH", database_path)
    database.initialize_database()

    case_id = "legacy-schema-test"

    with database._connection() as connection:
        connection.execute(
            """
            INSERT INTO handovers (
                case_id,
                owner_id,
                patient_reference,
                transcript,
                completed,
                pending,
                follow_up,
                communication,
                unclear_or_undocumented,
                created_at
            )
            VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                case_id,
                "synthetic note",
                "[]",
                "[]",
                "[]",
                "[]",
                "[]",
                "2026-01-01T00:00:00+00:00",
            ),
        )

    with database._connection() as connection:
        row = connection.execute(
            "SELECT owner_id FROM handovers WHERE case_id = ?",
            (case_id,),
        ).fetchone()

    assert row is not None
    assert row["owner_id"] is None
