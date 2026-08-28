import os
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError

import dependencies.auth as auth_dependency
import main
from models.trip import Trip
from models.user import User
from services.auth_service import InvalidCredentialsError, InvalidTokenError


class LoginEndpointTests(unittest.TestCase):
    def test_login_returns_bearer_access_token(self):
        db = MagicMock()
        user = User(id=1, name="Alice", email="alice@example.com")

        with (
            patch.object(main, "SessionLocal", return_value=db),
            patch.object(main, "authenticate_user", return_value=user),
            patch.object(main, "create_access_token", return_value="signed-jwt"),
        ):
            response = main.login(
                main.LoginRequest(
                    email="ALICE@EXAMPLE.COM",
                    password="password123",
                )
            )

        self.assertEqual(response.access_token, "signed-jwt")
        self.assertEqual(response.token_type, "bearer")
        db.close.assert_called_once_with()

    def test_login_returns_generic_unauthorized_error(self):
        db = MagicMock()

        with (
            patch.object(main, "SessionLocal", return_value=db),
            patch.object(
                main,
                "authenticate_user",
                side_effect=InvalidCredentialsError("Invalid email or password"),
            ),
        ):
            with self.assertRaises(HTTPException) as raised:
                main.login(
                    main.LoginRequest(
                        email="alice@example.com",
                        password="wrong-password",
                    )
                )

        self.assertEqual(raised.exception.status_code, 401)
        self.assertEqual(raised.exception.detail, "Invalid email or password")
        self.assertEqual(raised.exception.headers, {"WWW-Authenticate": "Bearer"})
        db.close.assert_called_once_with()


class AuthDependencyTests(unittest.TestCase):
    def test_missing_bearer_token_returns_unauthorized(self):
        with self.assertRaises(HTTPException) as raised:
            auth_dependency.get_current_user(None)

        self.assertEqual(raised.exception.status_code, 401)
        self.assertEqual(raised.exception.headers, {"WWW-Authenticate": "Bearer"})

    def test_invalid_bearer_token_returns_unauthorized(self):
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="invalid-token",
        )

        with patch.object(
            auth_dependency,
            "decode_access_token",
            side_effect=InvalidTokenError("invalid"),
        ):
            with self.assertRaises(HTTPException) as raised:
                auth_dependency.get_current_user(credentials)

        self.assertEqual(raised.exception.status_code, 401)

    def test_valid_token_resolves_active_user_and_closes_session(self):
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="signed-token",
        )
        user = User(id=1, name="Alice", email="alice@example.com", is_deleted=False)
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = user

        with (
            patch.object(auth_dependency, "decode_access_token", return_value=1),
            patch.object(auth_dependency, "SessionLocal", return_value=db),
        ):
            result = auth_dependency.get_current_user(credentials)

        self.assertIs(result, user)
        db.close.assert_called_once_with()


class ProtectedTripEndpointTests(unittest.TestCase):
    def setUp(self):
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        from database import Base

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
                        id=1,
                        user_id=1,
                        destination="Japan",
                        days=5,
                        budget=2000,
                        category="Premium",
                        daily_budget=400,
                        created_by=1,
                        updated_by=1,
                    ),
                    Trip(
                        id=2,
                        user_id=2,
                        destination="Korea",
                        days=4,
                        budget=1500,
                        category="Premium",
                        daily_budget=375,
                        created_by=2,
                        updated_by=2,
                    ),
                    Trip(
                        id=3,
                        user_id=1,
                        destination="Deleted",
                        days=1,
                        budget=100,
                        category="Budget",
                        daily_budget=100,
                        created_by=1,
                        updated_by=1,
                        is_deleted=True,
                    ),
                ]
            )
            db.commit()

    def tearDown(self):
        self.engine.dispose()

    def test_list_trips_returns_only_current_users_active_trips(self):
        current_user = SimpleNamespace(id=1)

        with patch.object(main, "SessionLocal", self.session_factory):
            trips = main.list_trips(current_user=current_user)

        self.assertEqual([trip.id for trip in trips], [1])

    def test_get_trip_hides_another_users_trip(self):
        current_user = SimpleNamespace(id=1)

        with patch.object(main, "SessionLocal", self.session_factory):
            with self.assertRaises(HTTPException) as raised:
                main.get_trip(trip_id=2, current_user=current_user)

        self.assertEqual(raised.exception.status_code, 404)

    def test_current_profile_returns_identity_and_active_trip_count(self):
        current_user = SimpleNamespace(
            id=1,
            name="Alice",
            email="alice@example.com",
        )

        with patch.object(main, "SessionLocal", self.session_factory):
            profile = main.get_current_profile(current_user=current_user)

        self.assertEqual(profile.id, 1)
        self.assertEqual(profile.name, "Alice")
        self.assertEqual(profile.email, "alice@example.com")
        self.assertEqual(profile.total_trips, 1)

    def test_update_trip_allows_owner_and_records_actor(self):
        current_user = SimpleNamespace(id=1)

        with patch.object(main, "SessionLocal", self.session_factory):
            trip = main.update_trip(
                trip_id=1,
                request=main.TripUpdateRequest(budget=800),
                current_user=current_user,
            )

        self.assertEqual(trip.budget, 800)
        self.assertEqual(trip.daily_budget, 160)
        self.assertEqual(trip.updated_by, 1)

    def test_update_trip_rejects_another_users_trip_with_forbidden(self):
        current_user = SimpleNamespace(id=1)

        with patch.object(main, "SessionLocal", self.session_factory):
            with self.assertRaises(HTTPException) as raised:
                main.update_trip(
                    trip_id=2,
                    request=main.TripUpdateRequest(budget=999),
                    current_user=current_user,
                )

        self.assertEqual(raised.exception.status_code, 403)
        with self.session_factory() as db:
            self.assertEqual(db.get(Trip, 2).budget, 1500)

    def test_delete_trip_allows_owner_and_records_actor(self):
        current_user = SimpleNamespace(id=1)

        with patch.object(main, "SessionLocal", self.session_factory):
            main.delete_trip(trip_id=1, current_user=current_user)

        with self.session_factory() as db:
            trip = db.get(Trip, 1)
            self.assertTrue(trip.is_deleted)
            self.assertEqual(trip.deleted_by, 1)
            self.assertEqual(trip.updated_by, 1)

    def test_delete_trip_rejects_another_users_trip_with_forbidden(self):
        current_user = SimpleNamespace(id=1)

        with patch.object(main, "SessionLocal", self.session_factory):
            with self.assertRaises(HTTPException) as raised:
                main.delete_trip(trip_id=2, current_user=current_user)

        self.assertEqual(raised.exception.status_code, 403)
        with self.session_factory() as db:
            trip = db.get(Trip, 2)
            self.assertFalse(trip.is_deleted)

    def test_generate_trip_rejects_another_users_trip_before_calling_ai(self):
        current_user = SimpleNamespace(id=1)
        bedrock = MagicMock()

        with (
            patch.object(main, "SessionLocal", self.session_factory),
            patch.object(main, "get_bedrock_service", return_value=bedrock),
        ):
            with self.assertRaises(HTTPException) as raised:
                main.generate_trip_recommendation(
                    trip_id=2,
                    current_user=current_user,
                )

        self.assertEqual(raised.exception.status_code, 403)
        bedrock.get_ai_recommendation.assert_not_called()

    def test_create_trip_assigns_owner_and_audit_from_current_user(self):
        current_user = SimpleNamespace(id=2)
        db = MagicMock()
        bedrock = MagicMock()
        bedrock.get_ai_recommendation.return_value = {
            "success": True,
            "recommendation": "AI itinerary",
        }

        with (
            patch.object(main, "SessionLocal", return_value=db),
            patch.object(main, "get_bedrock_service", return_value=bedrock),
        ):
            trip = main.create_trip(
                request=main.TripRequest(
                    destination="Korea",
                    days=4,
                    budget=1500,
                    month="October",
                    travel_style="Couple",
                ),
                current_user=current_user,
            )

        self.assertEqual(trip.user_id, 2)
        self.assertEqual(trip.created_by, 2)
        self.assertEqual(trip.updated_by, 2)
        db.add.assert_called_once_with(trip)
        db.commit.assert_called_once_with()
        db.refresh.assert_called_once_with(trip)
        db.close.assert_called_once_with()

    def test_trip_request_rejects_frontend_supplied_user_id(self):
        with self.assertRaises(ValidationError):
            main.TripRequest(
                destination="Korea",
                days=4,
                budget=1500,
                month="October",
                travel_style="Couple",
                user_id=999,
            )

    def test_user_scoped_endpoints_are_documented_as_bearer_protected(self):
        paths = main.app.openapi()["paths"]
        protected_operations = [
            paths["/api/v1/auth/me"]["get"],
            paths["/api/v1/trips"]["post"],
            paths["/api/v1/trips"]["get"],
            paths["/api/v1/trips/{trip_id}"]["get"],
            paths["/api/v1/trips/{trip_id}"]["put"],
            paths["/api/v1/trips/{trip_id}"]["delete"],
            paths["/api/v1/trips/{trip_id}/generate"]["post"],
        ]

        for operation in protected_operations:
            self.assertTrue(operation.get("security"))


if __name__ == "__main__":
    unittest.main()
