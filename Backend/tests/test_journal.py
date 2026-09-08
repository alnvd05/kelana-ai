import os
import unittest
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ.pop("JOURNAL_S3_BUCKET", None)

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import main
from database import Base
from models.journal import JournalEntry
from models.trip import Trip
from models.user import User


class JournalEndpointTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        self.session_factory = sessionmaker(bind=self.engine)
        with self.session_factory() as db:
            db.add_all(
                [
                    User(
                        id=1,
                        name="Alice",
                        email="alice@example.com",
                        password_hash="hash",
                        created_by=1,
                        updated_by=1,
                    ),
                    User(
                        id=2,
                        name="Bob",
                        email="bob@example.com",
                        password_hash="hash",
                        created_by=2,
                        updated_by=2,
                    ),
                    Trip(
                        id=10,
                        user_id=1,
                        destination="Bali",
                        days=5,
                        budget=1_000,
                        category="Standard",
                        daily_budget=200,
                        travel_style="Couple",
                        created_by=1,
                        updated_by=1,
                    ),
                    Trip(
                        id=20,
                        user_id=2,
                        destination="Tokyo",
                        days=4,
                        budget=1_200,
                        category="Standard",
                        daily_budget=300,
                        travel_style="Solo",
                        created_by=2,
                        updated_by=2,
                    ),
                ]
            )
            db.commit()

    def tearDown(self):
        self.engine.dispose()

    def test_create_and_list_notes_are_scoped_to_current_user(self):
        with patch.object(main, "SessionLocal", self.session_factory):
            created = main.create_journal_entry(
                request=main.JournalEntryCreateRequest(
                    entry_type="note",
                    title="Quiet morning in Ubud",
                    content="We found a small cafe beside the rice fields.",
                    location="Ubud, Bali",
                    occurred_on=date(2026, 9, 5),
                    trip_id=10,
                ),
                current_user=SimpleNamespace(id=1),
            )
            entries = main.list_journal_entries(
                current_user=SimpleNamespace(id=1)
            )
            bob_entries = main.list_journal_entries(
                current_user=SimpleNamespace(id=2)
            )

        self.assertEqual(created.trip_destination, "Bali")
        self.assertEqual([entry.title for entry in entries], ["Quiet morning in Ubud"])
        self.assertEqual(bob_entries, [])

    def test_cannot_attach_another_users_trip(self):
        with (
            patch.object(main, "SessionLocal", self.session_factory),
            self.assertRaises(HTTPException) as raised,
        ):
            main.create_journal_entry(
                request=main.JournalEntryCreateRequest(
                    entry_type="note",
                    title="Not mine",
                    content="This should fail.",
                    trip_id=20,
                ),
                current_user=SimpleNamespace(id=1),
            )

        self.assertEqual(raised.exception.status_code, 404)

    def test_moment_requires_an_owned_photo_key(self):
        with self.assertRaises(HTTPException) as missing:
            main.create_journal_entry(
                request=main.JournalEntryCreateRequest(
                    entry_type="moment",
                    title="Sunset",
                    content="A quiet evening.",
                ),
                current_user=SimpleNamespace(id=1),
            )
        with self.assertRaises(HTTPException) as foreign:
            main.create_journal_entry(
                request=main.JournalEntryCreateRequest(
                    entry_type="moment",
                    title="Sunset",
                    content="A quiet evening.",
                    photo_key="journal/2/photo.jpg",
                ),
                current_user=SimpleNamespace(id=1),
            )

        self.assertEqual(missing.exception.status_code, 422)
        self.assertEqual(foreign.exception.status_code, 403)

    def test_delete_is_soft_and_owner_scoped(self):
        with self.session_factory() as db:
            db.add(
                JournalEntry(
                    id=30,
                    user_id=1,
                    entry_type="note",
                    title="Keep this private",
                    content="Personal note",
                    created_by=1,
                    updated_by=1,
                )
            )
            db.commit()

        with patch.object(main, "SessionLocal", self.session_factory):
            with self.assertRaises(HTTPException) as raised:
                main.delete_journal_entry(
                    entry_id=30,
                    current_user=SimpleNamespace(id=2),
                )
            main.delete_journal_entry(
                entry_id=30,
                current_user=SimpleNamespace(id=1),
            )
            entries = main.list_journal_entries(
                current_user=SimpleNamespace(id=1)
            )

        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(entries, [])
        with self.session_factory() as db:
            stored = db.get(JournalEntry, 30)
            self.assertTrue(stored.is_deleted)
            self.assertEqual(stored.deleted_by, 1)

    def test_journal_routes_are_bearer_protected(self):
        paths = main.app.openapi()["paths"]
        operations = [
            paths["/api/v1/journal"]["post"],
            paths["/api/v1/journal"]["get"],
            paths["/api/v1/journal/photos"]["post"],
            paths["/api/v1/journal/{entry_id}"]["delete"],
        ]
        for operation in operations:
            self.assertTrue(operation.get("security"))


if __name__ == "__main__":
    unittest.main()
