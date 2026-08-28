import os
import unittest
from datetime import timedelta
from unittest.mock import MagicMock

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import bcrypt

import services.auth_service as auth_service
from models.user import User
from services.auth_service import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidTokenError,
    authenticate_user,
    create_access_token,
    decode_access_token,
    hash_password,
    register_user,
    verify_password,
)


class AuthServiceTests(unittest.TestCase):
    def test_hash_password_creates_verifiable_non_plaintext_hash(self):
        password = "password123"

        password_hash = hash_password(password)

        self.assertNotEqual(password_hash, password)
        self.assertTrue(
            bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
        )

    def test_verify_password_accepts_match_and_rejects_wrong_password(self):
        password_hash = hash_password("password123")

        self.assertTrue(verify_password("password123", password_hash))
        self.assertFalse(verify_password("wrong-password", password_hash))

    def test_authenticate_user_returns_active_user_for_valid_credentials(self):
        user = User(
            id=1,
            name="Alice",
            email="alice@example.com",
            password_hash=hash_password("password123"),
            is_deleted=False,
        )
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = user

        result = authenticate_user(
            db=db,
            email="  ALICE@EXAMPLE.COM  ",
            password="password123",
        )

        self.assertIs(result, user)

    def test_authenticate_user_uses_generic_error_for_wrong_password(self):
        user = User(
            id=1,
            name="Alice",
            email="alice@example.com",
            password_hash=hash_password("password123"),
            is_deleted=False,
        )
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = user

        with self.assertRaisesRegex(
            InvalidCredentialsError,
            "Invalid email or password",
        ):
            authenticate_user(
                db=db,
                email="alice@example.com",
                password="wrong-password",
            )

    def test_access_token_round_trip_carries_integer_user_id(self):
        with unittest.mock.patch.object(auth_service, "JWT_SECRET_KEY", "s" * 64):
            token = create_access_token(user_id=42)
            user_id = decode_access_token(token)

        self.assertEqual(user_id, 42)

    def test_decode_access_token_rejects_expired_token(self):
        with unittest.mock.patch.object(auth_service, "JWT_SECRET_KEY", "s" * 64):
            token = create_access_token(
                user_id=42,
                expires_delta=timedelta(seconds=-1),
            )
            with self.assertRaisesRegex(
                InvalidTokenError,
                "Invalid or expired access token",
            ):
                decode_access_token(token)

    def test_register_user_normalizes_fields_and_stores_only_hash(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        user = register_user(
            db=db,
            name="  Alice  ",
            email="  ALICE@EXAMPLE.COM  ",
            password="password123",
        )

        self.assertIsInstance(user, User)
        self.assertEqual(user.name, "Alice")
        self.assertEqual(user.email, "alice@example.com")
        self.assertNotEqual(user.password_hash, "password123")
        self.assertTrue(
            bcrypt.checkpw(
                b"password123",
                user.password_hash.encode("utf-8"),
            )
        )
        db.add.assert_called_once_with(user)
        db.flush.assert_called_once_with()
        db.commit.assert_called_once_with()
        db.refresh.assert_called_once_with(user)

    def test_register_user_rejects_duplicate_email(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = User(
            name="Existing User",
            email="alice@example.com",
            password_hash="stored-hash",
        )

        with self.assertRaisesRegex(
            EmailAlreadyRegisteredError,
            "Email is already registered",
        ):
            register_user(
                db=db,
                name="Alice",
                email="alice@example.com",
                password="password123",
            )

        db.add.assert_not_called()
        db.commit.assert_not_called()


if __name__ == "__main__":
    unittest.main()
