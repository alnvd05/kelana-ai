from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# load .env so os.getenv() can read it
load_dotenv()

# connection string from .env — never hardcode secrets
DATABASE_URL = os.getenv("DATABASE_URL")

# engine = the connection pool
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")

# Reconnect when a pooled connection has expired on the managed database.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# SessionLocal = a factory for DB sessions
SessionLocal = sessionmaker(bind=engine, autoflush=False)

# Base = all ORM models inherit from this
Base = declarative_base()

# create all tables
def init_db() -> None:
    """Create all SQLAlchemy tables for the configured database."""
    # Import every model before create_all so SQLAlchemy knows about all tables.
    # Keeping this inside init_db avoids connecting to the database as a side
    # effect of importing this module.
    import models.user  # noqa: F401
    import models.trip  # noqa: F401
    import models.conversation  # noqa: F401
    import models.journal  # noqa: F401

    Base.metadata.create_all(bind=engine)
