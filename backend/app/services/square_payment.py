"""
Square Payment Gateway Integration Service
"""

import os
import json
import uuid
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from decimal import Decimal

# Square Python SDK
from square import Square

logger = logging.getLogger(__name__)

class SquarePaymentService:
    """
    Square Payment Gateway Integration Service
    Handles payment processing, subscriptions, and customer management
    """
    
    def __init__(self, access_token=None, environment="sandbox"):
        """Initialize Square client"""
        self.access_token = access_token or os.getenv("SQUARE_ACCESS_TOKEN")
        self.environment = environment or os.getenv("SQUARE_ENVIRONMENT", "sandbox")
        
        if not self.access_token:
            logger.warning("Square access token not provided. Using sandbox mode with limited functionality.")
        
        self.client = Square(
            access_token=self.access_token,
            environment=self.environment
        )
    
    def create_customer(self, company_name: str, email: str, phone: str = None, 
                       address: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Create a customer in Square
        
        Args:
            company_name: Company name
            email: Company email
            phone: Company phone number
            address: Company address dict with keys: address_line_1, address_line_2, locality, 
                    administrative_district_level_1, postal_code, country
                    
        Returns:
            Dict with customer details including Square customer ID
        """
        try:
            # Create request body
            body = {
                "idempotency_key": str(uuid.uuid4()),
                "given_name": company_name,
                "email_address": email,
            }
            
            if phone:
                body["phone_number"] = phone
                
            if address:
                body["address"] = address
            
            # Make API call
            result = self.client.customers.create_customer(body)
            
            if result.is_success():
                logger.info(f"Created Square customer for {company_name}")
                return {
                    "success": True,
                    "customer_id": result.body["customer"]["id"],
                    "created_at": result.body["customer"]["created_at"]
                }
            else:
                logger.error(f"Failed to create Square customer: {result.errors}")
                return {
                    "success": False,
                    "errors": result.errors
                }
                
        except ApiException as e:
            logger.exception(f"Square API error: {e}")
            return {
                "success": False,
                "errors": str(e)
            }
    
    def create_card_payment_method(self, customer_id: str, card_nonce: str, 
                                  billing_address: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Create a card payment method for a customer
        
        Args:
            customer_id: Square customer ID
            card_nonce: Card nonce from Square.js
            billing_address: Billing address dict
            
        Returns:
            Dict with card details
        """
        try:
            # Create request body
            body = {
                "idempotency_key": str(uuid.uuid4()),
                "source_id": card_nonce,
                "card": {
                    "customer_id": customer_id,
                }
            }
            
            if billing_address:
                body["billing_address"] = billing_address
            
            # Make API call
            result = self.client.cards.create_card(body)
            
            if result.is_success():
                card = result.body["card"]
                logger.info(f"Created card payment method for customer {customer_id}")
                return {
                    "success": True,
                    "card_id": card["id"],
                    "last_4": card["last_4"],
                    "card_brand": card["card_brand"],
                    "exp_month": card["exp_month"],
                    "exp_year": card["exp_year"]
                }
            else:
                logger.error(f"Failed to create card payment method: {result.errors}")
                return {
                    "success": False,
                    "errors": result.errors
                }
                
        except ApiException as e:
            logger.exception(f"Square API error: {e}")
            return {
                "success": False,
                "errors": str(e)
            }
    
    def process_payment(self, amount: Decimal, currency: str, customer_id: str, 
                       card_id: str, idempotency_key: str = None, 
                       note: str = None) -> Dict[str, Any]:
        """
        Process a payment using Square
        
        Args:
            amount: Payment amount
            currency: Currency code (e.g., USD)
            customer_id: Square customer ID
            card_id: Square card ID
            idempotency_key: Unique key to prevent duplicate payments
            note: Payment note
            
        Returns:
            Dict with payment details
        """
        try:
            # Convert Decimal to integer cents
            amount_cents = int(amount * 100)
            
            # Create request body
            body = {
                "idempotency_key": idempotency_key or str(uuid.uuid4()),
                "source_id": card_id,
                "customer_id": customer_id,
                "amount_money": {
                    "amount": amount_cents,
                    "currency": currency
                },
                "autocomplete": True
            }
            
            if note:
                body["note"] = note
            
            # Make API call
            result = self.client.payments.create_payment(body)
            
            if result.is_success():
                payment = result.body["payment"]
                logger.info(f"Processed payment of {amount} {currency} for customer {customer_id}")
                return {
                    "success": True,
                    "payment_id": payment["id"],
                    "status": payment["status"],
                    "receipt_url": payment.get("receipt_url"),
                    "created_at": payment["created_at"]
                }
            else:
                logger.error(f"Failed to process payment: {result.errors}")
                return {
                    "success": False,
                    "errors": result.errors
                }
                
        except ApiException as e:
            logger.exception(f"Square API error: {e}")
            return {
                "success": False,
                "errors": str(e)
            }
    
    def get_customer(self, customer_id: str) -> Dict[str, Any]:
        """
        Get customer details from Square
        
        Args:
            customer_id: Square customer ID
            
        Returns:
            Dict with customer details
        """
        try:
            result = self.client.customers.retrieve_customer(customer_id)
            
            if result.is_success():
                return {
                    "success": True,
                    "customer": result.body["customer"]
                }
            else:
                logger.error(f"Failed to get customer: {result.errors}")
                return {
                    "success": False,
                    "errors": result.errors
                }
                
        except ApiException as e:
            logger.exception(f"Square API error: {e}")
            return {
                "success": False,
                "errors": str(e)
            }
    
    def get_payment_methods(self, customer_id: str) -> Dict[str, Any]:
        """
        Get payment methods for a customer
        
        Args:
            customer_id: Square customer ID
            
        Returns:
            Dict with payment methods
        """
        try:
            result = self.client.cards.list_cards(customer_id=customer_id)
            
            if result.is_success():
                return {
                    "success": True,
                    "cards": result.body["cards"] if "cards" in result.body else []
                }
            else:
                logger.error(f"Failed to get payment methods: {result.errors}")
                return {
                    "success": False,
                    "errors": result.errors
                }
                
        except ApiException as e:
            logger.exception(f"Square API error: {e}")
            return {
                "success": False,
                "errors": str(e)
            }
    
    def create_invoice(self, customer_id: str, amount: Decimal, currency: str, 
                      due_date: datetime, title: str, description: str = None,
                      scheduled_at: datetime = None) -> Dict[str, Any]:
        """
        Create an invoice in Square
        
        Args:
            customer_id: Square customer ID
            amount: Invoice amount
            currency: Currency code (e.g., USD)
            due_date: Invoice due date
            title: Invoice title
            description: Invoice description
            scheduled_at: When to schedule the invoice
            
        Returns:
            Dict with invoice details
        """
        try:
            # Convert Decimal to integer cents
            amount_cents = int(amount * 100)
            
            # Create request body
            body = {
                "idempotency_key": str(uuid.uuid4()),
                "invoice": {
                    "primary_recipient": {
                        "customer_id": customer_id
                    },
                    "payment_requests": [
                        {
                            "request_type": "BALANCE",
                            "due_date": due_date.strftime("%Y-%m-%d"),
                            "tipping_enabled": False,
                            "automatic_payment_source": "NONE",
                            "reminders": [
                                {
                                    "relative_scheduled_days": -1,
                                    "message": f"Your invoice for {title} is due tomorrow"
                                },
                                {
                                    "relative_scheduled_days": 1,
                                    "message": f"Your invoice for {title} is overdue"
                                }
                            ]
                        }
                    ],
                    "title": title,
                    "scheduled_at": scheduled_at.isoformat() if scheduled_at else None,
                    "delivery_method": "EMAIL",
                    "invoice_source": {
                        "application_id": "CRM App"
                    }
                }
            }
            
            if description:
                body["invoice"]["description"] = description
            
            # Add line item
            body["invoice"]["payment_requests"][0]["computed_amount_money"] = {
                "amount": amount_cents,
                "currency": currency
            }
            
            # Make API call
            result = self.client.invoices.create_invoice(body)
            
            if result.is_success():
                invoice = result.body["invoice"]
                logger.info(f"Created invoice for customer {customer_id}")
                return {
                    "success": True,
                    "invoice_id": invoice["id"],
                    "status": invoice["status"],
                    "invoice_number": invoice.get("invoice_number"),
                    "public_url": invoice.get("public_url")
                }
            else:
                logger.error(f"Failed to create invoice: {result.errors}")
                return {
                    "success": False,
                    "errors": result.errors
                }
                
        except ApiException as e:
            logger.exception(f"Square API error: {e}")
            return {
                "success": False,
                "errors": str(e)
            }
    
    def get_invoice(self, invoice_id: str) -> Dict[str, Any]:
        """
        Get invoice details from Square
        
        Args:
            invoice_id: Square invoice ID
            
        Returns:
            Dict with invoice details
        """
        try:
            result = self.client.invoices.get_invoice(invoice_id)
            
            if result.is_success():
                return {
                    "success": True,
                    "invoice": result.body["invoice"]
                }
            else:
                logger.error(f"Failed to get invoice: {result.errors}")
                return {
                    "success": False,
                    "errors": result.errors
                }
                
        except ApiException as e:
            logger.exception(f"Square API error: {e}")
            return {
                "success": False,
                "errors": str(e)
            }
    
    def cancel_invoice(self, invoice_id: str, version: int) -> Dict[str, Any]:
        """
        Cancel an invoice in Square
        
        Args:
            invoice_id: Square invoice ID
            version: Invoice version
            
        Returns:
            Dict with cancellation status
        """
        try:
            result = self.client.invoices.cancel_invoice(invoice_id, {"version": version})
            
            if result.is_success():
                logger.info(f"Cancelled invoice {invoice_id}")
                return {
                    "success": True,
                    "invoice": result.body["invoice"]
                }
            else:
                logger.error(f"Failed to cancel invoice: {result.errors}")
                return {
                    "success": False,
                    "errors": result.errors
                }
                
        except ApiException as e:
            logger.exception(f"Square API error: {e}")
            return {
                "success": False,
                "errors": str(e)
            }
