#!/usr/bin/env python3
"""
Check Super Admin user and their company_id
"""
import sys
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.models import User, Company

def check_super_admin():
    db = SessionLocal()
    try:
        # Find super admin users
        super_admins = db.query(User).filter(
            User.user_role == 'super_admin'
        ).all()
        
        print(f"\n{'='*60}")
        print(f"Found {len(super_admins)} Super Admin user(s)")
        print(f"{'='*60}\n")
        
        for admin in super_admins:
            print(f"Email: {admin.email}")
            print(f"Name: {admin.first_name} {admin.last_name}")
            print(f"User Role: {admin.user_role}")
            print(f"Company ID: {admin.company_id}")
            print(f"Is Active: {admin.is_active}")
            print(f"Is Deleted: {admin.is_deleted}")
            
            if admin.company_id:
                company = db.query(Company).filter(Company.id == admin.company_id).first()
                if company:
                    print(f"Company Name: {company.name}")
                    print(f"Company Status: {company.status}")
                else:
                    print(f"⚠️  WARNING: Company ID exists but company not found!")
            else:
                print(f"⚠️  WARNING: No company_id assigned!")
                print(f"\nTo fix this, you need to:")
                print(f"1. Create a company for Super Admin")
                print(f"2. Or assign Super Admin to an existing company")
            
            print(f"\n{'-'*60}\n")
        
        # Show all companies
        companies = db.query(Company).all()
        print(f"\nTotal Companies: {len(companies)}")
        for company in companies:
            print(f"  - {company.name} (ID: {company.id}, Status: {company.status})")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_super_admin()
