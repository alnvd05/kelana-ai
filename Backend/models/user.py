from sqlalchemy import Column, BigInteger, String
from sqlalchemy.orm import relationship
from database import Base
from models.audit import AuditMixin


class User(AuditMixin, Base):
    __tablename__ = "users"

    id            = Column(BigInteger, primary_key=True, autoincrement=True)
    name          = Column(String(100),  nullable=False)
    email         = Column(String(255),  nullable=False, unique=True)
    password_hash = Column(String(255),  nullable=False)
    trips = relationship("Trip", back_populates="user")
