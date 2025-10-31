"""
Payment History model for tracking Square payments
"""

from sqlalchemy import Column, String, ForeignKey, DECIMAL, TIMESTAMP, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from .base import BaseModel


class PaymentHistory(BaseModel):
    """
    Track all payment transactions via Square
    """
    __tablename__ = 'payment_history'
    
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    square_payment_id = Column(String(255), unique=True)  # Square payment transaction ID
    amount = Column(DECIMAL(10, 2), nullable=False)
    currency = Column(String(3), default='USD')
    status = Column(String(50), nullable=False, index=True)  # completed, failed, refunded, pending
    payment_method = Column(String(50))  # card, ach, etc.
    card_last_4 = Column(String(4))
    card_brand = Column(String(50))
    receipt_url = Column(Text)
    failure_reason = Column(Text)
    
    # Relationship
    company = relationship('Company', backref='payment_history')
    
    def __repr__(self):
        return f"<PaymentHistory {self.square_payment_id} - ${self.amount} - {self.status}>"
