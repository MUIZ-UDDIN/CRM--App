#!/usr/bin/env python3
"""
Script to verify all registered routes in the FastAPI application
"""

import sys
sys.path.insert(0, 'backend')

from app.main import app

print("=" * 80)
print("REGISTERED ROUTES IN FASTAPI")
print("=" * 80)

routes = []
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        for method in route.methods:
            routes.append((method, route.path))

# Sort and display
routes.sort(key=lambda x: x[1])

for method, path in routes:
    print(f"{method:8} {path}")

print("=" * 80)
print(f"Total routes: {len(routes)}")
print("=" * 80)

# Check specific routes
print("\nChecking specific routes:")
notifications_routes = [r for r in routes if '/notifications' in r[1]]
emails_routes = [r for r in routes if '/emails' in r[1]]
files_routes = [r for r in routes if '/files' in r[1]]

print(f"\nNotifications routes: {len(notifications_routes)}")
for method, path in notifications_routes:
    print(f"  {method:8} {path}")

print(f"\nEmails routes: {len(emails_routes)}")
for method, path in emails_routes:
    print(f"  {method:8} {path}")

print(f"\nFiles routes: {len(files_routes)}")
for method, path in files_routes:
    print(f"  {method:8} {path}")
