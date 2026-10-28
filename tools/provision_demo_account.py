"""Explicitly provision or remove the showcase account; never creates defaults."""

import getpass
import os
import argparse

from app.auth import create_user, remove_user_by_staff_id


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--remove-staff-id", help="Remove only this account if it owns no handovers")
    args = parser.parse_args()
    if args.remove_staff_id:
        try:
            remove_user_by_staff_id(args.remove_staff_id)
        except ValueError as error:
            raise SystemExit(str(error)) from error
        print("Account removed.")
        return

    staff_id = os.getenv("HANDOVERGUARD_DEMO_STAFF_ID") or input("Demo Staff ID: ")
    password = os.getenv("HANDOVERGUARD_DEMO_PASSWORD")
    if password is None:
        password = getpass.getpass("Demo password: ")
    try:
        create_user(staff_id, password)
    except ValueError as error:
        raise SystemExit(str(error)) from error
    print("Demo account created.")


if __name__ == "__main__":
    main()
