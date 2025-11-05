"""
Custom Error Handlers
Prevents database queries and internal errors from being exposed in API responses
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, DataError
from pydantic import ValidationError
import traceback
from loguru import logger


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    Handle SQLAlchemy errors without exposing database queries
    """
    # Log the full error internally
    logger.error(f"Database error on {request.url.path}: {str(exc)}")
    logger.error(f"Full traceback: {traceback.format_exc()}")
    
    # Return generic error to client (NO database details)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "A database error occurred. Please try again later.",
            "error_code": "DATABASE_ERROR"
        }
    )


async def integrity_error_handler(request: Request, exc: IntegrityError):
    """
    Handle database integrity errors (unique constraints, foreign keys, etc.)
    """
    # Log the full error internally
    logger.error(f"Integrity error on {request.url.path}: {str(exc)}")
    logger.error(f"Full traceback: {traceback.format_exc()}")
    
    # Parse the error to provide a user-friendly message
    error_message = str(exc.orig) if hasattr(exc, 'orig') else str(exc)
    
    # Check for common integrity errors
    if "unique constraint" in error_message.lower() or "duplicate" in error_message.lower():
        detail = "A record with this information already exists."
    elif "foreign key" in error_message.lower():
        detail = "Cannot complete this operation due to related records."
    elif "not null" in error_message.lower():
        detail = "Required information is missing."
    else:
        detail = "Cannot complete this operation due to data constraints."
    
    # Return user-friendly error (NO SQL query or table names)
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": detail,
            "error_code": "INTEGRITY_ERROR"
        }
    )


async def data_error_handler(request: Request, exc: DataError):
    """
    Handle database data errors (invalid data types, etc.)
    """
    # Log the full error internally
    logger.error(f"Data error on {request.url.path}: {str(exc)}")
    logger.error(f"Full traceback: {traceback.format_exc()}")
    
    # Return generic error (NO database details)
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": "Invalid data format. Please check your input.",
            "error_code": "DATA_ERROR"
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle Pydantic validation errors
    """
    # Log validation errors
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    
    # Return validation errors (these are safe - no database info)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "error_code": "VALIDATION_ERROR"
        }
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """
    Handle all other exceptions
    """
    # Log the full error internally
    logger.error(f"Unhandled error on {request.url.path}: {str(exc)}")
    logger.error(f"Full traceback: {traceback.format_exc()}")
    
    # Return generic error (NO internal details)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred. Please try again later.",
            "error_code": "INTERNAL_ERROR"
        }
    )


def register_error_handlers(app):
    """
    Register all custom error handlers with the FastAPI app
    """
    # SQLAlchemy errors
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(DataError, data_error_handler)
    
    # Validation errors
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # Generic errors (catch-all)
    app.add_exception_handler(Exception, generic_exception_handler)
    
    logger.info("✅ Custom error handlers registered - Database queries will not be exposed")
