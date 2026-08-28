"""
migrate.py — minimal SQL migration runner.

Tracks applied migrations in a `schema_migrations` table so each file
is executed exactly once, in filename order.

Usage:
    python migrate.py

No extra packages required — uses psycopg2 which is already in requirements.txt.
"""

import os
import glob
import psycopg2
from dotenv import load_dotenv
from sqlalchemy.engine import make_url

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
LEGACY_OWNER_EMAIL = os.getenv("LEGACY_OWNER_EMAIL")
MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "migrations")


def get_connection():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not configured")

    url = make_url(DATABASE_URL)
    if not url.drivername.startswith("postgresql"):
        raise ValueError("Migration runner requires a PostgreSQL DATABASE_URL")

    connection_options = {
        "dbname": url.database,
        "user": url.username,
        "password": url.password,
        "host": url.host,
        "port": url.port,
    }
    connection_options.update(dict(url.query))

    # Pass connection values separately so psycopg2 does not receive the
    # SQLAlchemy-only `postgresql+psycopg2://` driver name.
    return psycopg2.connect(
        **{key: value for key, value in connection_options.items() if value is not None}
    )


def ensure_migrations_table(conn):
    """Create the schema_migrations tracking table if it doesn't exist."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version     VARCHAR(255) PRIMARY KEY,
                applied_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
            );
        """)
    conn.commit()


def applied_versions(conn) -> set:
    """Return the set of already-applied migration versions."""
    with conn.cursor() as cur:
        cur.execute("SELECT version FROM schema_migrations;")
        return {row[0] for row in cur.fetchall()}


def migration_parameters(sql: str):
    """Return parameters required by a migration without storing PII in SQL."""
    if "%(legacy_owner_email)s" not in sql:
        return None

    if not LEGACY_OWNER_EMAIL:
        raise RuntimeError(
            "LEGACY_OWNER_EMAIL is required to finalize legacy trip ownership"
        )

    return {"legacy_owner_email": LEGACY_OWNER_EMAIL.strip().lower()}


def run_migrations():
    conn = get_connection()
    try:
        ensure_migrations_table(conn)
        done = applied_versions(conn)

        # collect and sort SQL files by filename
        pattern = os.path.join(MIGRATIONS_DIR, "*.sql")
        files = sorted(glob.glob(pattern))

        if not files:
            print("No migration files found in", MIGRATIONS_DIR)
            return

        pending = [f for f in files if os.path.basename(f) not in done]

        if not pending:
            print("All migrations already applied.")
            return

        for filepath in pending:
            version = os.path.basename(filepath)
            print(f"Applying {version} ...", end=" ")

            with open(filepath, "r") as fh:
                sql = fh.read()

            with conn.cursor() as cur:
                parameters = migration_parameters(sql)
                if parameters is None:
                    cur.execute(sql)
                else:
                    cur.execute(sql, parameters)
                cur.execute(
                    "INSERT INTO schema_migrations (version) VALUES (%s);",
                    (version,)
                )
            conn.commit()
            print("done.")

        print(f"\n{len(pending)} migration(s) applied successfully.")
    except Exception as exc:
        conn.rollback()
        # Do not print the exception text: connection errors can include a full
        # DATABASE_URL and expose credentials in terminal logs.
        print(f"\nMigration failed ({type(exc).__name__}).")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    try:
        run_migrations()
    except Exception:
        raise SystemExit(1)
