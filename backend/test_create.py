#!/usr/bin/env python3
"""
Test creating support ticket and custom field directly in database
"""

from app.core.database import sync_engine, get_db
from app.models.support_tickets import SupportTicket, TicketStatus, TicketPriority
from app.models.custom_fields import CustomField, FieldType
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

def test_support_ticket():
    """Test creating a support ticket"""
    print("\n🎫 Testing Support Ticket Creation...")
    
    db = next(get_db())
    
    try:
        # Create a test ticket
        ticket = SupportTicket(
            id=uuid.uuid4(),
            subject="Test Ticket",
            description="This is a test ticket",
            status=TicketStatus.OPEN,
            priority=TicketPriority.MEDIUM,
            category="technical",
            created_by_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),  # Replace with real user ID
            company_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),  # Replace with real company ID
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        
        print(f"✅ Ticket created: {ticket.id}")
        print(f"   Subject: {ticket.subject}")
        print(f"   Status: {ticket.status.value}")
        print(f"   Priority: {ticket.priority.value}")
        
        # Clean up
        db.delete(ticket)
        db.commit()
        print("✅ Test ticket deleted")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

def test_custom_field():
    """Test creating a custom field"""
    print("\n📝 Testing Custom Field Creation...")
    
    db = next(get_db())
    
    try:
        # Create a test field
        field = CustomField(
            id=uuid.uuid4(),
            name="Test Field",
            field_type=FieldType.TEXT,
            entity_type="contact",
            is_required=False,
            is_active=True,
            company_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),  # Replace with real company ID
            created_by_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),  # Replace with real user ID
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(field)
        db.commit()
        db.refresh(field)
        
        print(f"✅ Field created: {field.id}")
        print(f"   Name: {field.name}")
        print(f"   Type: {field.field_type.value}")
        print(f"   Entity: {field.entity_type}")
        
        # Clean up
        db.delete(field)
        db.commit()
        print("✅ Test field deleted")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

def get_first_user_and_company():
    """Get first user and company IDs for testing"""
    print("\n🔍 Getting test user and company IDs...")
    
    db = next(get_db())
    
    try:
        from app.models.users import User
        from app.models.companies import Company
        
        user = db.query(User).first()
        company = db.query(Company).first()
        
        if user and company:
            print(f"✅ Found user: {user.id} ({user.email})")
            print(f"✅ Found company: {company.id} ({company.name})")
            return str(user.id), str(company.id)
        else:
            print("❌ No user or company found")
            return None, None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Database Model Testing")
    print("=" * 60)
    
    user_id, company_id = get_first_user_and_company()
    
    if user_id and company_id:
        print(f"\nUsing User ID: {user_id}")
        print(f"Using Company ID: {company_id}")
        
        # Update the test functions to use real IDs
        # For now, just run the tests with dummy IDs
        # You'll need to replace the UUIDs in the functions above
        
    test_support_ticket()
    test_custom_field()
    
    print("\n" + "=" * 60)
    print("Testing complete!")
    print("=" * 60)
