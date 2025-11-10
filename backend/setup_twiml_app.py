"""
Script to create or update TwiML App for Twilio Device SDK
Run this once to set up the TwiML App
"""

from twilio.rest import Client
import os
from dotenv import load_dotenv

load_dotenv()

# Twilio credentials from environment
ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
DOMAIN = os.getenv("DOMAIN", "sunstonecrm.com")

if not ACCOUNT_SID or not AUTH_TOKEN:
    print("❌ Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in .env file")
    exit(1)

client = Client(ACCOUNT_SID, AUTH_TOKEN)

# Check if TwiML App already exists
apps = client.applications.list(friendly_name="CRM Voice App")

if apps:
    app = apps[0]
    print(f"✅ TwiML App already exists: {app.sid}")
    print(f"   Friendly Name: {app.friendly_name}")
    
    # Update the app with correct URLs
    app = client.applications(app.sid).update(
        voice_url=f"https://{DOMAIN}/api/twilio/client/voice",
        voice_method="POST",
        status_callback=f"https://{DOMAIN}/api/webhooks/twilio/voice/status",
        status_callback_method="POST"
    )
    print(f"✅ TwiML App updated with voice URL")
else:
    # Create new TwiML App
    app = client.applications.create(
        friendly_name="CRM Voice App",
        voice_url=f"https://{DOMAIN}/api/twilio/client/voice",
        voice_method="POST",
        status_callback=f"https://{DOMAIN}/api/webhooks/twilio/voice/status",
        status_callback_method="POST"
    )
    print(f"✅ TwiML App created: {app.sid}")

print(f"\n📋 TwiML App SID: {app.sid}")
print(f"📋 Voice URL: {app.voice_url}")
print(f"📋 Status Callback: {app.status_callback}")
print(f"\n⚠️  IMPORTANT: Add this to your .env file:")
print(f"TWIML_APP_SID={app.sid}")
