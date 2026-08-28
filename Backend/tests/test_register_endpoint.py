import os
import unittest
from unittest.mock import MagicMock, patch

os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import main
from models.user import User
from pydantic import ValidationError
from services.auth_service import EmailAlreadyRegisteredError


class RegisterEndpointTests(unittest.TestCase):
    def test_register_request_rejects_invalid_email(self):
        with self.assertRaises(ValidationError):
            main.RegisterRequest(
                name="Alice",
                email="alice@example@com.com",
                password="password123",
            )

    def test_register_request_rejects_password_over_bcrypt_byte_limit(self):
        with self.assertRaises(ValidationError):
            main.RegisterRequest(
                name="Alice",
                email="alice@example.com",
                password="密" * 30,
            )

    def test_register_route_is_documented_without_password_hash(self):
        openapi = main.app.openapi()
        operation = openapi["paths"]["/api/v1/auth/register"]["post"]

        self.assertIn("201", operation["responses"])
        response_schema = openapi["components"]["schemas"]["RegisterResponse"]
        self.assertEqual(set(response_schema["properties"]), {"id", "name", "email"})

    def test_register_returns_created_user_and_closes_session(self):
        db = MagicMock()
        created_user = User(
            id=1,
            name="Alice",
            email="alice@example.com",
            password_hash="bcrypt-hash",
        )

        with (
            patch.object(main, "SessionLocal", return_value=db),
            patch.object(main, "register_user", return_value=created_user) as service,
        ):
            result = main.register(
                main.RegisterRequest(
                    name="Alice",
                    email="ALICE@EXAMPLE.COM",
                    password="password123",
                )
            )

        self.assertIs(result, created_user)
        service.assert_called_once_with(
            db=db,
            name="Alice",
            email="alice@example.com",
            password="password123",
        )
        db.close.assert_called_once_with()

    def test_register_translates_duplicate_email_to_conflict(self):
        db = MagicMock()

        with (
            patch.object(main, "SessionLocal", return_value=db),
            patch.object(
                main,
                "register_user",
                side_effect=EmailAlreadyRegisteredError("Email is already registered"),
            ),
        ):
            with self.assertRaises(main.HTTPException) as raised:
                main.register(
                    main.RegisterRequest(
                        name="Alice",
                        email="alice@example.com",
                        password="password123",
                    )
                )

        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(raised.exception.detail, "Email is already registered")
        db.close.assert_called_once_with()


if __name__ == "__main__":
    unittest.main()
