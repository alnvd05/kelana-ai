import unittest
from unittest.mock import patch

import migrate


class MigrationRunnerTests(unittest.TestCase):
    def test_get_connection_converts_sqlalchemy_url_to_psycopg2_options(self):
        database_url = "postgresql+psycopg2://test_user:test_password@localhost:5432/test_db"

        with (
            patch.object(migrate, "DATABASE_URL", database_url),
            patch.object(migrate.psycopg2, "connect") as connect,
        ):
            migrate.get_connection()

        connect.assert_called_once_with(
            dbname="test_db",
            user="test_user",
            password="test_password",
            host="localhost",
            port=5432,
        )

    def test_get_connection_rejects_non_postgresql_url(self):
        with patch.object(migrate, "DATABASE_URL", "sqlite:///test.db"):
            with self.assertRaisesRegex(ValueError, "requires a PostgreSQL"):
                migrate.get_connection()

    def test_migration_parameters_supplies_normalized_legacy_owner_email(self):
        sql = "SELECT %(legacy_owner_email)s;"

        with patch.object(
            migrate,
            "LEGACY_OWNER_EMAIL",
            "  ALVINDJUNAIDI454@GMAIL.COM  ",
        ):
            parameters = migrate.migration_parameters(sql)

        self.assertEqual(
            parameters,
            {"legacy_owner_email": "alvindjunaidi454@gmail.com"},
        )

    def test_migration_parameters_requires_legacy_owner_email(self):
        sql = "SELECT %(legacy_owner_email)s;"

        with patch.object(migrate, "LEGACY_OWNER_EMAIL", None):
            with self.assertRaisesRegex(RuntimeError, "LEGACY_OWNER_EMAIL is required"):
                migrate.migration_parameters(sql)


if __name__ == "__main__":
    unittest.main()
