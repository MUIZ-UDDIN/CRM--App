#!/usr/bin/env python3
"""
Create Super Admin User
Run this script after multi-tenant migration to create the first super admin
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.models import User, UserRole, UserStatus
from app.core.database import sync_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_super_admin(email: str, password: str, first_name: str = "Super", last_name: str = "Admin"):
    """Create a super admin user"""
    
    SessionLocal = sessionmaker(bind=sync_engine)
    db = SessionLocal()
    
    try:
        # Check if super admin already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f'⚠️  User with email {email} already exists')
            print(f'   Role: {existing.user_role.value if existing.user_role else "N/A"}')
            
            # Update to super admin if not already
            if existing.user_role != UserRole.SUPER_ADMIN:
                existing.user_role = UserRole.SUPER_ADMIN
                existing.company_id = None
                existing.status = UserStatus.ACTIVE
                db.commit()
                print(f'✅ Updated {email} to Super Admin role')
            return
        
        # Create new super admin
        admin = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            hashed_password=pwd_context.hash(password),
            user_role=UserRole.SUPER_ADMIN,
            company_id=None,  # NULL for super admin
            status=UserStatus.ACTIVE,
            email_verified=True
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print('=' * 60)
        print('✅ Super Admin Created Successfully!')
        print('=' * 60)
        print(f'Email:    {email}')
        print(f'Password: {password}')
        print(f'Role:     Super Admin')
        print(f'ID:       {admin.id}')
        print('=' * 60)
        print('⚠️  IMPORTANT: Change this password immediately after first login!')
        print('=' * 60)
        
    except Exception as e:
        print(f'❌ Error creating super admin: {e}')
        db.rollback()
        raise
    finally:
        db.close()


def main():
    """Main function"""
    print('=' * 60)
    print('Super Admin User Creation')
    print('=' * 60)
    print()
    
    # Default credentials (change these!)
    email = input('Enter email (default: admin@yourcrm.com): ').strip() or 'admin@yourcrm.com'
    password = input('Enter password (default: ChangeThisPassword123!): ').strip() or 'ChangeThisPassword123!'
    first_name = input('Enter first name (default: Super): ').strip() or 'Super'
    last_name = input('Enter last name (default: Admin): ').strip() or 'Admin'
    
    print()
    print('Creating super admin with:')
    print(f'  Email: {email}')
    print(f'  Name: {first_name} {last_name}')
    print()
    
    confirm = input('Continue? (yes/no): ').strip().lower()
    if confirm != 'yes':
        print('Cancelled.')
        return
    
    print()
    create_super_admin(email, password, first_name, last_name)


if __name__ == '__main__':
    main()
