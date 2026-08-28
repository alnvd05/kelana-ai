from sqlalchemy import Column, BigInteger, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from models.audit import AuditMixin


class Trip(AuditMixin, Base):
    __tablename__ = "trips"

    id           = Column(Integer, primary_key=True)
    user_id      = Column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    destination  = Column(String, nullable=False)
    days         = Column(Integer, nullable=False)
    budget       = Column(Float, nullable=False)
    category     = Column(String, nullable=False)
    daily_budget = Column(Float, nullable=False)
    travel_style = Column(String, nullable=True)
    ai_recommendation = Column(Text, nullable=True)
    user              = relationship("User", back_populates="trips")
