"""
Files API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.security import get_current_active_user
from app.core.database import get_db
from app.models.files import File, Folder

router = APIRouter()


# Pydantic Models
class FileResponse(BaseModel):
    id: str
    name: str
    original_name: str
    file_type: Optional[str]
    size: Optional[int]
    category: Optional[str]
    tags: List[str] = []
    url: Optional[str]
    created_at: str
    updated_at: Optional[str]
    
    class Config:
        from_attributes = True


class FolderResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    created_at: str
    
    class Config:
        from_attributes = True


class FileCreate(BaseModel):
    name: str
    category: Optional[str]
    tags: List[str] = []
    folder_id: Optional[str]
    contact_id: Optional[str]
    deal_id: Optional[str]


class FolderCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None


@router.get("/", response_model=List[FileResponse])
async def get_files(
    category: Optional[str] = None,
    folder_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all files for the current user"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    query = db.query(File).filter(
        and_(
            File.owner_id == user_id,
            File.is_deleted == False
        )
    )
    
    if category:
        query = query.filter(File.category == category)
    
    if folder_id:
        query = query.filter(File.folder_id == uuid.UUID(folder_id))
    
    files = query.order_by(desc(File.created_at)).all()
    
    return [
        FileResponse(
            id=str(file.id),
            name=file.name,
            original_name=file.original_name,
            file_type=file.file_type,
            size=file.size,
            category=file.category,
            tags=file.tags or [],
            url=file.url,
            created_at=file.created_at.isoformat() if file.created_at else None,
            updated_at=file.updated_at.isoformat() if file.updated_at else None
        )
        for file in files
    ]


@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload a file"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # For now, just create a file record without actually storing the file
    # In production, you'd save to S3/storage and get the URL
    new_file = File(
        name=file.filename,
        original_name=file.filename,
        file_type=file.content_type,
        size=0,  # Would be file.size in real implementation
        category=category,
        storage_path=f"/uploads/{file.filename}",  # Mock path
        url=f"/uploads/{file.filename}",  # Mock URL
        owner_id=user_id
    )
    
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    return FileResponse(
        id=str(new_file.id),
        name=new_file.name,
        original_name=new_file.original_name,
        file_type=new_file.file_type,
        size=new_file.size,
        category=new_file.category,
        tags=new_file.tags or [],
        url=new_file.url,
        created_at=new_file.created_at.isoformat() if new_file.created_at else None,
        updated_at=new_file.updated_at.isoformat() if new_file.updated_at else None
    )


@router.post("/", response_model=FileResponse)
async def create_file(
    file_data: FileCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new file record"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    new_file = File(
        name=file_data.name,
        original_name=file_data.name,
        category=file_data.category,
        tags=file_data.tags,
        folder_id=uuid.UUID(file_data.folder_id) if file_data.folder_id else None,
        contact_id=uuid.UUID(file_data.contact_id) if file_data.contact_id else None,
        deal_id=uuid.UUID(file_data.deal_id) if file_data.deal_id else None,
        owner_id=user_id
    )
    
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    return FileResponse(
        id=str(new_file.id),
        name=new_file.name,
        original_name=new_file.original_name,
        file_type=new_file.file_type,
        size=new_file.size,
        category=new_file.category,
        tags=new_file.tags or [],
        url=new_file.url,
        created_at=new_file.created_at.isoformat() if new_file.created_at else None,
        updated_at=new_file.updated_at.isoformat() if new_file.updated_at else None
    )


@router.get("/{file_id}", response_model=FileResponse)
async def get_file(
    file_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific file"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    file = db.query(File).filter(
        and_(
            File.id == uuid.UUID(file_id),
            File.owner_id == user_id,
            File.is_deleted == False
        )
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        id=str(file.id),
        name=file.name,
        original_name=file.original_name,
        file_type=file.file_type,
        size=file.size,
        category=file.category,
        tags=file.tags or [],
        url=file.url,
        created_at=file.created_at.isoformat() if file.created_at else None,
        updated_at=file.updated_at.isoformat() if file.updated_at else None
    )


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a file"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    file = db.query(File).filter(
        and_(
            File.id == uuid.UUID(file_id),
            File.owner_id == user_id,
            File.is_deleted == False
        )
    ).first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    file.is_deleted = True
    db.commit()
    
    return {"message": "File deleted successfully"}


# Folder endpoints
@router.get("/folders/", response_model=List[FolderResponse])
async def get_folders(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all folders"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    folders = db.query(Folder).filter(
        and_(
            Folder.owner_id == user_id,
            Folder.is_deleted == False
        )
    ).order_by(Folder.name).all()
    
    return [
        FolderResponse(
            id=str(folder.id),
            name=folder.name,
            description=folder.description,
            created_at=folder.created_at.isoformat() if folder.created_at else None
        )
        for folder in folders
    ]


@router.post("/folders", response_model=FolderResponse)
async def create_folder(
    folder_data: FolderCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new folder"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    new_folder = Folder(
        name=folder_data.name,
        description=folder_data.description,
        parent_id=uuid.UUID(folder_data.parent_id) if folder_data.parent_id else None,
        owner_id=user_id
    )
    
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    
    return FolderResponse(
        id=str(new_folder.id),
        name=new_folder.name,
        description=new_folder.description,
        created_at=new_folder.created_at.isoformat() if new_folder.created_at else None
    )


@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a folder"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    folder = db.query(Folder).filter(
        and_(
            Folder.id == uuid.UUID(folder_id),
            Folder.owner_id == user_id,
            Folder.is_deleted == False
        )
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    folder.is_deleted = True
    db.commit()
    
    return {"message": "Folder deleted successfully"}
