from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base
from models.audit import AuditMixin


sqlite_compatible_bigint = BigInteger().with_variant(Integer, "sqlite")


class JournalEntry(AuditMixin, Base):
    __tablename__ = "journal_entries"
    __table_args__ = (
        CheckConstraint(
            "entry_type IN ('moment', 'note')",
            name="ck_journal_entries_type",
        ),
    )

    id = Column(sqlite_compatible_bigint, primary_key=True, autoincrement=True)
    user_id = Column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    trip_id = Column(
        Integer,
        ForeignKey("trips.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    entry_type = Column(String(16), nullable=False, index=True)
    title = Column(String(160), nullable=False)
    content = Column(Text, nullable=False)
    location = Column(String(160), nullable=True)
    occurred_on = Column(Date, nullable=True)
    photo_key = Column(String(512), nullable=True)

    user = relationship("User", back_populates="journal_entries")
    trip = relationship("Trip", back_populates="journal_entries")
