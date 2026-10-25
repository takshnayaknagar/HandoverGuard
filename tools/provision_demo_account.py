"""Explicitly provision the initial demo account; never creates defaults."""

import getpass
import os

from app.auth import create_user


def main() -> None:
    username = os.getenv("HANDOVERGUARD_DEMO_USERNAME") or input("Demo username/email: ")
    password = os.getenv("HANDOVERGUARD_DEMO_PASSWORD")
    if password is None:
        password = getpass.getpass("Demo password: ")
    try:
        create_user(username, password)
    except ValueError as error:
        raise SystemExit(str(error)) from error
    print("Demo account created.")


if __name__ == "__main__":
    main()
