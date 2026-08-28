from sqlalchemy import BigInteger, Boolean, Column, DateTime, text
from sqlalchemy.sql import func


class AuditMixin:
    """Reusable audit and soft-delete columns for persisted models."""

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    created_by = Column(BigInteger, nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    updated_by = Column(BigInteger, nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(BigInteger, nullable=True)
    is_deleted = Column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
        index=True,
    )
