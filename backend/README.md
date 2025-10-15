# Sales CRM Backend API

A comprehensive Sales CRM system backend built with FastAPI, featuring authentication, contact management, deal tracking, activities, and analytics.

## Features

- **Authentication**: JWT-based authentication with login/logout
- **Users Management**: User profiles and team management
- **Contacts**: Contact management with search and filtering
- **Deals**: Deal pipeline management with stages and values
- **Activities**: Task and activity tracking with due dates
- **Analytics**: Comprehensive analytics and reporting
- **API Documentation**: Auto-generated Swagger/OpenAPI docs

## Tech Stack

- **FastAPI**: Modern, fast Python web framework
- **SQLAlchemy**: SQL toolkit and Object-Relational Mapping
- **PostgreSQL**: Primary database (optional for demo)
- **Redis**: Caching and session storage (optional for demo)
- **JWT**: JSON Web Token authentication
- **Pydantic**: Data validation and serialization
- **Uvicorn**: ASGI server

## Quick Start

### Prerequisites

- Python 3.10+
- pip (Python package installer)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CRM/backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start the development server:
```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API Base**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/` - List all users

### Contacts
- `GET /api/contacts/` - List contacts with filtering
- `POST /api/contacts/` - Create new contact
- `GET /api/contacts/{id}` - Get contact by ID
- `PUT /api/contacts/{id}` - Update contact
- `DELETE /api/contacts/{id}` - Delete contact

### Deals
- `GET /api/deals/` - List deals with filtering
- `POST /api/deals/` - Create new deal
- `GET /api/deals/{id}` - Get deal by ID
- `PUT /api/deals/{id}` - Update deal
- `DELETE /api/deals/{id}` - Delete deal
- `GET /api/deals/stats/pipeline` - Pipeline statistics

### Activities
- `GET /api/activities/` - List activities with filtering
- `POST /api/activities/` - Create new activity
- `GET /api/activities/{id}` - Get activity by ID
- `PUT /api/activities/{id}` - Update activity
- `DELETE /api/activities/{id}` - Delete activity
- `POST /api/activities/{id}/complete` - Mark activity as completed

### Analytics
- `GET /api/analytics/pipeline` - Pipeline analytics
- `GET /api/analytics/activities` - Activity analytics
- `GET /api/analytics/revenue` - Revenue analytics
- `GET /api/analytics/users` - User performance analytics
- `GET /api/analytics/contacts` - Contact source analytics
- `GET /api/analytics/dashboard` - Dashboard summary

## Demo Authentication

For demo purposes, use these credentials:
- **Email**: admin@company.com
- **Password**: admin123

## Development Notes

- The application includes mock data for demonstration
- Database and Redis connections are optional - the app will run without them
- All endpoints except authentication require JWT authorization
- CORS is configured for frontend development

## Production Deployment

1. Set up PostgreSQL and Redis servers
2. Update environment variables in `.env`
3. Install production dependencies
4. Use a production WSGI server like Gunicorn:
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

## API Documentation

Once the server is running, visit http://localhost:8000/docs for interactive API documentation with Swagger UI.

## Environment Variables

See `.env.example` for all available configuration options:
- Database connection strings
- Redis connection
- JWT secret keys
- CORS settings
- Feature flags