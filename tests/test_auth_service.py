from datetime import timedelta
from pathlib import Path

import app.auth as auth
import app.database as database


def test_auth_tests_use_an_isolated_database(monkeypatch, tmp_path):
    isolated_path = tmp_path / "auth-isolated.db"
    monkeypatch.setattr(database, "DATABASE_PATH", isolated_path)

    auth.create_user("isolated", "a sufficiently long password")

    assert database.DATABASE_PATH == isolated_path
    assert isolated_path.exists()
    assert not (Path("data") / "handovers.db").resolve() == isolated_path.resolve()


def test_password_hashing_and_safe_verification(monkeypatch, tmp_path):
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "auth.db")
    password = "correct horse battery staple"
    stored = auth.hash_password(password)
    assert stored != password
    assert stored.startswith("$argon2")
    assert auth.verify_password(password, stored)
    assert not auth.verify_password("wrong password", stored)
    assert not auth.verify_password(password, "not-a-hash")


def test_duplicate_user_and_session_lifecycle(monkeypatch, tmp_path):
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "auth.db")
    user_id = auth.create_user(" Demo@Example.com ", "a sufficiently long password")
    assert auth.get_user_by_username("demo@example.com")["user_id"] == user_id
    try:
        auth.create_user("demo@example.com", "another sufficiently long password")
    except ValueError as error:
        assert "already exists" in str(error)
    else:
        raise AssertionError("duplicate account was accepted")

    token, _ = auth.create_session(user_id, timedelta(hours=1))
    assert auth.get_user_for_session(token)["user_id"] == user_id
    connection = database.get_connection()
    try:
        row = connection.execute("SELECT token_hash FROM sessions").fetchone()
    finally:
        connection.close()
    assert row["token_hash"] != token
    assert auth.revoke_session(token)
    assert auth.get_user_for_session(token) is None


def test_expired_and_unknown_sessions_are_rejected(monkeypatch, tmp_path):
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "auth.db")
    user_id = auth.create_user("demo", "a sufficiently long password")
    token, _ = auth.create_session(user_id, timedelta(seconds=1))
    with database._connection() as connection:
        connection.execute(
            "UPDATE sessions SET expires_at = ?",
            ("2000-01-01T00:00:00+00:00",),
        )
    assert auth.get_user_for_session(token) is None
    assert auth.get_user_for_session("malformed") is None


def test_inactive_user_session_is_rejected(monkeypatch, tmp_path):
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "auth.db")

    user_id = auth.create_user("demo", "a sufficiently long password")
    token, _ = auth.create_session(user_id)

    assert auth.get_user_for_session(token)["user_id"] == user_id

    with database._connection() as connection:
        connection.execute(
            "UPDATE users SET is_active = 0 WHERE user_id = ?",
            (user_id,),
        )

    assert auth.get_user_for_session(token) is None
