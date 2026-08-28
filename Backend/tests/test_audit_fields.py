import os
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import main
from models.trip import Trip
from models.user import User


class AuditFieldTests(unittest.TestCase):
    def test_user_and_trip_models_expose_all_audit_columns(self):
        expected_columns = {
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
            "deleted_at",
            "deleted_by",
            "is_deleted",
        }

        for model in (User, Trip):
            with self.subTest(model=model.__name__):
                self.assertTrue(expected_columns.issubset(model.__table__.columns.keys()))

    def test_delete_trip_sets_soft_delete_fields_without_removing_row(self):
        trip = Trip(
            id=7,
            user_id=1,
            destination="Bali",
            days=3,
            budget=700,
            category="Budget",
            daily_budget=233.33,
            is_deleted=False,
        )
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = trip

        with patch.object(main, "SessionLocal", return_value=db):
            result = main.delete_trip(7, current_user=SimpleNamespace(id=1))

        self.assertTrue(trip.is_deleted)
        self.assertIsNotNone(trip.deleted_at)
        self.assertEqual(trip.updated_at, trip.deleted_at)
        self.assertEqual(trip.deleted_by, 1)
        self.assertEqual(trip.updated_by, 1)
        db.delete.assert_not_called()
        db.commit.assert_called_once_with()
        db.refresh.assert_called_once_with(trip)
        db.close.assert_called_once_with()
        self.assertEqual(result, {"message": "Trip with id 7 soft deleted successfully"})


if __name__ == "__main__":
    unittest.main()
