# WebSocket Real-Time Sync Audit

## Current Status

### Backend Broadcasting (✅ = Has WebSocket, ❌ = Missing)

#### Deals
- ✅ Create (added)
- ✅ Update (existing)
- ✅ Delete (existing)

#### Activities
- ✅ Create (added)
- ✅ Update (added)
- ✅ Delete (added)

#### Contacts
- ❌ Create
- ❌ Update
- ❌ Delete

#### Pipelines
- ❌ Create
- ❌ Update
- ❌ Delete
- ❌ Stage Create
- ❌ Stage Update
- ❌ Stage Delete

#### Quotes
- ❌ Create
- ❌ Update
- ❌ Delete

#### Teams
- ❌ Create
- ❌ Update
- ❌ Delete
- ❌ Add Member
- ❌ Remove Member
- ❌ Set Team Lead

#### Users
- ❌ Create
- ❌ Update
- ❌ Delete
- ❌ Role Change

#### Companies
- ❌ Create
- ❌ Update
- ❌ Delete
- ❌ Suspend
- ❌ Activate

## Frontend Issues

### WebSocket Service
- ❌ Listening for old event types (deal_created, contact_created)
- ✅ Backend sends new format (entity_change)
- ❌ No generic entity_change handler

### Fix Required
1. Update frontend to listen for "entity_change" events
2. Add generic handler for all entity types
3. Trigger appropriate refreshes based on entity_type and action

## Implementation Plan

### Phase 1: Backend Broadcasting
Add broadcast_entity_change to all CRUD operations for:
- Contacts (create, update, delete)
- Pipelines (create, update, delete, stages)
- Quotes (create, update, delete)
- Teams (create, update, delete, members)
- Users (create, update, delete, role change)
- Companies (create, update, delete, suspend, activate)

### Phase 2: Frontend Listener
Update websocketService.ts to:
- Add entity_change handler
- Map entity types to refresh functions
- Keep backward compatibility with old events

### Phase 3: Page-Level Integration
Update pages to listen for entity_change events:
- Contacts page
- Deals page
- Activities page
- Pipelines page
- Teams page
- Users/Company Management page
