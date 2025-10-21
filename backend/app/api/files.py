"""
Files API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form
from fastapi.responses import FileResponse as FastAPIFileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid
import os

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
    folder_id: Optional[str] = None
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


class FileUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    folder_id: Optional[str] = None


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
            folder_id=str(file.folder_id) if file.folder_id else None,
            created_at=file.created_at.isoformat() if file.created_at else None,
            updated_at=file.updated_at.isoformat() if file.updated_at else None
        )
        for file in files
    ]


@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    category: Optional[str] = Form(None),
    folder_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload a file"""
    import os
    import shutil
    from pathlib import Path
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("/var/www/crm-app/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save file to disk
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = file_path.stat().st_size
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create database record
    # Handle folder_id - convert to UUID if valid, otherwise None
    folder_uuid = None
    if folder_id and folder_id.strip():
        try:
            folder_uuid = uuid.UUID(folder_id)
        except ValueError:
            pass
    
    new_file = File(
        name=file.filename,
        original_name=file.filename,
        file_type=file.content_type,
        size=file_size,
        category=category,
        storage_path=str(file_path),
        url=str(file_path),
        folder_id=folder_uuid,
        owner_id=user_id
    )
    
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    print(f"Uploaded file - folder_id: {new_file.folder_id}")
    
    return FileResponse(
        id=str(new_file.id),
        name=new_file.name,
        original_name=new_file.original_name,
        file_type=new_file.file_type,
        size=new_file.size,
        category=new_file.category,
        tags=new_file.tags or [],
        url=new_file.url,
        folder_id=str(new_file.folder_id) if new_file.folder_id else None,
        created_at=new_file.created_at.isoformat() if new_file.created_at else None,
        updated_at=new_file.updated_at.isoformat() if new_file.updated_at else None
    )


@router.patch("/{file_id}", response_model=FileResponse)
async def update_file(
    file_id: str,
    file_update: FileUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a file's metadata"""
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
    
    # Update fields
    update_data = file_update.dict(exclude_unset=True)
    print(f"Updating file {file_id} with data: {update_data}")
    for field, value in update_data.items():
        # Handle folder_id conversion to UUID
        if field == 'folder_id':
            if value is None or value == '':
                print(f"Setting folder_id to None")
                setattr(file, field, None)
            else:
                try:
                    folder_uuid = uuid.UUID(value)
                    print(f"Setting folder_id to {folder_uuid}")
                    setattr(file, field, folder_uuid)
                except ValueError:
                    print(f"Invalid folder_id UUID: {value}")
                    pass
        else:
            setattr(file, field, value)
    
    from datetime import datetime
    file.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(file)
    
    print(f"File after update - folder_id: {file.folder_id}")
    
    return FileResponse(
        id=str(file.id),
        name=file.name,
        original_name=file.original_name,
        file_type=file.file_type,
        size=file.size,
        category=file.category,
        tags=file.tags or [],
        url=file.url,
        folder_id=str(file.folder_id) if file.folder_id else None,
        created_at=file.created_at.isoformat() if file.created_at else None,
        updated_at=file.updated_at.isoformat() if file.updated_at else None
    )


# Folder endpoints (MUST be before /{file_id} to avoid route conflicts)
@router.get("/folders", response_model=List[FolderResponse])
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


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Download a file"""
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
    
    # Check if file exists on disk
    if file.url and os.path.exists(file.url):
        return FastAPIFileResponse(
            path=file.url,
            filename=file.original_name,
            media_type='application/octet-stream'
        )
    else:
        raise HTTPException(status_code=404, detail="File not found on disk")


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
