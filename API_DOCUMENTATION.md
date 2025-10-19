# CRM REST API Documentation

## Base URL
- **Production**: `https://sunstonecrm.com/api`
- **Development**: `http://localhost:8000/api`

## Authentication

All API requests require authentication using Bearer token.

### Get Access Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Using the Token

Include the token in all subsequent requests:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Contacts API

### List All Contacts

```http
GET /contacts/
```

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum number of records to return (default: 100)
- `search` (optional): Search term for filtering contacts

**Response:**
```json
[
  {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Acme Corp",
    "title": "CEO",
    "type": "Lead",
    "status": "new",
    "owner_id": "uuid",
    "created_at": "2025-10-19T10:00:00Z",
    "updated_at": "2025-10-19T10:00:00Z"
  }
]
```

### Get Single Contact

```http
GET /contacts/{contact_id}
```

**Response:**
```json
{
  "id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "mobile": "+1234567891",
  "company": "Acme Corp",
  "title": "CEO",
  "type": "Lead",
  "department": "Sales",
  "website": "https://acme.com",
  "address_line1": "123 Main St",
  "address_line2": "Suite 100",
  "city": "New York",
  "state": "NY",
  "postal_code": "10001",
  "country": "USA",
  "status": "new",
  "source": "Website",
  "lead_score": 85,
  "owner_id": "uuid",
  "notes": "Important client",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "twitter_handle": "@johndoe",
  "created_at": "2025-10-19T10:00:00Z",
  "updated_at": "2025-10-19T10:00:00Z"
}
```

### Create Contact

```http
POST /contacts/
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "company": "Tech Corp",
  "title": "CTO",
  "type": "Lead"
}
```

**Response:** Same as Get Single Contact

### Update Contact

```http
PUT /contacts/{contact_id}
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "status": "qualified"
}
```

**Response:** Same as Get Single Contact

### Partial Update Contact

```http
PATCH /contacts/{contact_id}
Content-Type: application/json

{
  "status": "qualified",
  "lead_score": 90
}
```

**Response:** Same as Get Single Contact

### Delete Contact (Soft Delete)

```http
DELETE /contacts/{contact_id}
```

**Response:**
```json
{
  "message": "Contact deleted successfully"
}
```

### Upload Contacts from CSV

```http
POST /contacts/upload-csv
Content-Type: multipart/form-data

file: contacts.csv
```

**CSV Format:**
```csv
first_name,last_name,email,phone,company,title,type
John,Doe,john@example.com,+1234567890,Acme Corp,CEO,Lead
Jane,Smith,jane@example.com,+1234567891,Tech Corp,CTO,Customer
```

**Response:**
```json
{
  "message": "CSV upload completed",
  "created_count": 2,
  "failed_count": 0,
  "errors": []
}
```

### Upload Contacts from Excel

```http
POST /contacts/upload-excel
Content-Type: multipart/form-data

file: contacts.xlsx
```

**Response:** Same as CSV upload

### Get Contact Statistics

```http
GET /contacts/stats
```

**Response:**
```json
{
  "total_contacts": 150,
  "leads": 50,
  "customers": 80,
  "partners": 20,
  "new_this_month": 15,
  "conversion_rate": 0.65,
  "status_breakdown": {
    "new": 30,
    "contacted": 40,
    "qualified": 50,
    "lost": 30
  },
  "companies_breakdown": {
    "Acme Corp": 5,
    "Tech Corp": 3
  }
}
```

---

## Users API

### Get Current User

```http
GET /users/me
```

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "user",
  "is_active": true,
  "created_at": "2025-10-19T10:00:00Z"
}
```

### Register New User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "first_name": "New",
  "last_name": "User"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "first_name": "New",
    "last_name": "User"
  }
}
```

---

## Deals API

### List All Deals

```http
GET /deals/
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Enterprise Deal",
    "value": 50000.00,
    "stage": "proposal",
    "probability": 75,
    "expected_close_date": "2025-12-31",
    "contact_id": "uuid",
    "owner_id": "uuid",
    "created_at": "2025-10-19T10:00:00Z",
    "updated_at": "2025-10-19T10:00:00Z"
  }
]
```

### Create Deal

```http
POST /deals/
Content-Type: application/json

{
  "title": "New Enterprise Deal",
  "value": 75000.00,
  "stage": "prospecting",
  "probability": 25,
  "expected_close_date": "2025-12-31",
  "contact_id": "uuid"
}
```

---

## Activities API

### List Activities

```http
GET /activities/
```

**Query Parameters:**
- `contact_id` (optional): Filter by contact
- `type` (optional): Filter by type (call, email, meeting, task)
- `skip` (optional): Pagination offset
- `limit` (optional): Pagination limit

**Response:**
```json
[
  {
    "id": "uuid",
    "type": "call",
    "subject": "Follow-up call",
    "description": "Discussed pricing",
    "scheduled_at": "2025-10-20T14:00:00Z",
    "completed_at": null,
    "contact_id": "uuid",
    "owner_id": "uuid",
    "created_at": "2025-10-19T10:00:00Z"
  }
]
```

### Create Activity

```http
POST /activities/
Content-Type: application/json

{
  "type": "meeting",
  "subject": "Product Demo",
  "description": "Showcase new features",
  "scheduled_at": "2025-10-25T10:00:00Z",
  "contact_id": "uuid"
}
```

---

## Error Responses

All endpoints return standard HTTP status codes:

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

**Error Response Format:**
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Rate Limiting

- **Rate Limit**: 100 requests per minute per user
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## Webhooks (Coming Soon)

Subscribe to events:
- `contact.created`
- `contact.updated`
- `contact.deleted`
- `deal.created`
- `deal.updated`
- `deal.won`
- `deal.lost`

---

## Example: Complete Integration Flow

### 1. Authenticate
```bash
curl -X POST https://sunstonecrm.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### 2. Create Contact
```bash
curl -X POST https://sunstonecrm.com/api/contacts/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "company": "Acme Corp"
  }'
```

### 3. List Contacts
```bash
curl -X GET https://sunstonecrm.com/api/contacts/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Update Contact
```bash
curl -X PATCH https://sunstonecrm.com/api/contacts/CONTACT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"qualified"}'
```

---

## SDKs and Libraries

### Python Example
```python
import requests

class CRMClient:
    def __init__(self, base_url, email, password):
        self.base_url = base_url
        self.token = self._login(email, password)
    
    def _login(self, email, password):
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        return response.json()["access_token"]
    
    def get_contacts(self):
        response = requests.get(
            f"{self.base_url}/contacts/",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        return response.json()
    
    def create_contact(self, contact_data):
        response = requests.post(
            f"{self.base_url}/contacts/",
            headers={"Authorization": f"Bearer {self.token}"},
            json=contact_data
        )
        return response.json()

# Usage
client = CRMClient("https://sunstonecrm.com/api", "user@example.com", "password")
contacts = client.get_contacts()
```

### JavaScript/Node.js Example
```javascript
class CRMClient {
  constructor(baseUrl, email, password) {
    this.baseUrl = baseUrl;
    this.login(email, password);
  }

  async login(email, password) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    this.token = data.access_token;
  }

  async getContacts() {
    const response = await fetch(`${this.baseUrl}/contacts/`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  async createContact(contactData) {
    const response = await fetch(`${this.baseUrl}/contacts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactData)
    });
    return response.json();
  }
}

// Usage
const client = new CRMClient('https://sunstonecrm.com/api', 'user@example.com', 'password');
const contacts = await client.getContacts();
```

---

## Support

For API support, contact: support@sunstonecrm.com
