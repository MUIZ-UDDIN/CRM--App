#!/usr/bin/env python3
"""
Test API endpoints to debug 500 errors
"""

import requests
import json

BASE_URL = "https://sunstonecrm.com/api"

# You'll need to replace this with a real token
TOKEN = "YOUR_TOKEN_HERE"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def test_support_tickets():
    """Test support tickets creation"""
    print("\n🎫 Testing Support Tickets API...")
    
    data = {
        "subject": "Test Ticket",
        "description": "This is a test ticket",
        "priority": "medium",
        "category": "technical"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/support-tickets/",
            headers=headers,
            json=data
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 200:
            print("✅ Support Tickets API working!")
        else:
            print(f"❌ Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_custom_fields():
    """Test custom fields creation"""
    print("\n📝 Testing Custom Fields API...")
    
    data = {
        "name": "Test Field",
        "field_type": "text",
        "entity_type": "contact",
        "is_required": False
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/custom-fields/",
            headers=headers,
            json=data
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 200:
            print("✅ Custom Fields API working!")
        else:
            print(f"❌ Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

def test_workflow_templates():
    """Test workflow templates"""
    print("\n⚡ Testing Workflow Templates API...")
    
    try:
        response = requests.get(
            f"{BASE_URL}/workflow-templates/",
            headers=headers
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 200:
            print("✅ Workflow Templates API working!")
        else:
            print(f"❌ Error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("API Testing Script")
    print("=" * 60)
    print("\n⚠️  Remember to set your TOKEN in the script!")
    print("\nTo get your token:")
    print("1. Login to https://sunstonecrm.com")
    print("2. Open browser console")
    print("3. Run: localStorage.getItem('token')")
    print("4. Copy the token and paste it in this script")
    
    # Uncomment when you have a token
    # test_support_tickets()
    # test_custom_fields()
    # test_workflow_templates()
