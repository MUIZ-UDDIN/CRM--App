"""
Security utilities for authentication and authorization
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from ..models.users import User as UserModel

# Password hashing
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__ident="2b",  # Use bcrypt 2b variant
    bcrypt__truncate_error=False  # Don't error on long passwords, truncate instead
)

# JWT Security
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash"""
    # Truncate password to 72 bytes for bcrypt compatibility
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = plain_password[:72]
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Get password hash"""
    # Truncate password to 72 bytes for bcrypt compatibility
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode JWT token"""
    try:
        # Add more detailed logging for token verification
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Validate expiration time explicitly
        if 'exp' in payload:
            expiration = datetime.fromtimestamp(payload['exp'])
            if expiration < datetime.utcnow():
                print(f"Token expired at {expiration}, current time: {datetime.utcnow()}")
                return None
        
        return payload
    except JWTError as e:
        print(f"JWT verification error: {str(e)}")
        return None
    except Exception as e:
        print(f"Unexpected error during token verification: {str(e)}")
        return None


def authenticate_user(db: Session, email: str, password: str) -> Optional[UserModel]:
    """Authenticate user with email and password"""
    user = db.query(UserModel).filter(
        UserModel.email == email,
        UserModel.is_deleted == False,
        UserModel.is_active == True
    ).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> dict:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Check if credentials exist
        if not credentials or not credentials.credentials:
            print("No credentials provided")
            raise credentials_exception
            
        # Verify the token
        token = credentials.credentials
        print(f"DEBUG: Processing token: {token[:15]}...")
        
        # TEMPORARY FIX: Try to decode token without verification for debugging
        try:
            # First try normal verification
            payload = verify_token(token)
            if payload is None:
                print(f"Invalid token: {token[:15]}...")
                # For debugging, try to decode without verification
                try:
                    import jwt
                    debug_payload = jwt.decode(token, options={"verify_signature": False})
                    print(f"DEBUG: Token payload without verification: {debug_payload}")
                except Exception as e:
                    print(f"DEBUG: Could not decode token even without verification: {e}")
                raise credentials_exception
        except Exception as e:
            print(f"DEBUG: Token verification error: {e}")
            raise credentials_exception
        
        # Extract email from token
        email: str = payload.get("sub")
        if email is None:
            print("Token missing 'sub' claim")
            raise credentials_exception
            
        # Fetch the user from database
        try:
            user = db.query(UserModel).filter(UserModel.email == email).first()
            if user is None:
                print(f"User not found for email: {email}")
                raise credentials_exception
                
            # Check if user is active
            if not user.is_active:
                print(f"User {email} is not active")
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
                
            # Get user role - try both fields for compatibility
            user_role = None
            if hasattr(user, 'user_role'):
                if hasattr(user.user_role, 'value'):
                    user_role = user.user_role.value
                else:
                    user_role = str(user.user_role)
            
            # Use legacy role field as fallback
            if not user_role and hasattr(user, 'role'):
                user_role = user.role
            
            # Default to 'company_user' if no role found
            if not user_role:
                user_role = 'company_user'
            
            # Log the role information for debugging
            print(f"User {user.email} role: {user_role}")
            
            # Prepare user data with both role fields for compatibility
            user_data = {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user_role,  # Primary role field
                "user_role": user_role,  # Add user_role field for compatibility
                "company_id": str(user.company_id) if user.company_id else None,
                "team_id": str(user.team_id) if user.team_id else None,
                "is_active": True
            }
            return user_data
        except Exception as db_error:
            print(f"Database error while fetching user: {str(db_error)}")
            raise credentials_exception
            
    except JWTError as jwt_error:
        print(f"JWT error: {str(jwt_error)}")
        raise credentials_exception
    except Exception as e:
        print(f"Unexpected error in get_current_user: {str(e)}")
        raise credentials_exception


def get_current_active_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Get current active user"""
    if not current_user.get("is_active"):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_user_ws(token: str) -> dict:
    """Get current user from JWT token for WebSocket connections"""
    from .database import SessionLocal
    
    try:
        payload = verify_token(token)
        if payload is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Create a new database session for this request
        db = SessionLocal()
        try:
            # Fetch the user from database
            user = db.query(UserModel).filter(UserModel.email == email).first()
            if user is None or not user.is_active:
                raise HTTPException(status_code=401, detail="User not found or inactive")
            
            # Get user role - try both fields for compatibility
            user_role = None
            if hasattr(user, 'user_role'):
                if hasattr(user.user_role, 'value'):
                    user_role = user.user_role.value
                else:
                    user_role = str(user.user_role)
            
            # Use legacy role field as fallback
            if not user_role and hasattr(user, 'role'):
                user_role = user.role
            
            # Default to 'company_user' if no role found
            if not user_role:
                user_role = 'company_user'
            
            # Log the role information for debugging
            print(f"WS User {user.email} role: {user_role}")
            
            # Prepare user data with both role fields for compatibility
            user_data = {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user_role,  # Primary role field
                "user_role": user_role,  # Add user_role field for compatibility
                "company_id": str(user.company_id) if user.company_id else None,
                "team_id": str(user.team_id) if user.team_id else None,
                "is_active": True
            }
            return user_data
        finally:
            db.close()
    
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
