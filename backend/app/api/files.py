"""
Files API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form, status
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
from app.middleware.tenant import get_tenant_context
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter()


# Pydantic Models
class FileResponse(BaseModel):
    id: str
    name: str
    original_name: str
    file_type: Optional[str]
    size: Optional[int]
    category: Optional[str]
    description: Optional[str] = None
    status: Optional[str] = 'active'
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
    category: Optional[str] = None
    status: Optional[str] = 'active'
    tags: List[str] = []
    parent_id: Optional[str] = None
    size: Optional[int] = None
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
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    folder_id: Optional[str] = None


class FolderCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = 'active'
    tags: List[str] = []
    parent_id: Optional[str] = None


@router.get("/", response_model=List[FileResponse])
async def get_files(
    category: Optional[str] = None,
    folder_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all files for the current company"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    query = db.query(File).filter(
        and_(
            File.company_id == company_id,
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
            description=file.description,
            status=file.status if hasattr(file, 'status') else 'active',
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
    description: Optional[str] = Form(None),
    status: Optional[str] = Form('active'),
    folder_id: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload a file"""
    import os
    import shutil
    from pathlib import Path
    import json
    
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    # Check for duplicate file with same name in the same folder for this company
    folder_uuid = None
    if folder_id and folder_id.strip():
        try:
            folder_uuid = uuid.UUID(folder_id)
        except ValueError:
            pass
    
    existing_file = db.query(File).filter(
        and_(
            File.name == file.filename,
            File.folder_id == folder_uuid,
            File.company_id == company_id,
            File.is_deleted == False
        )
    ).first()
    
    if existing_file:
        raise HTTPException(
            status_code=400,
            detail=f"A file with name '{file.filename}' already exists in this location. Please rename the file or choose a different location."
        )
    
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
        print(f"Error saving file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file. Please try again.")
    
    # Create database record
    # Parse tags if provided
    tags_list = []
    if tags:
        try:
            tags_list = json.loads(tags)
        except:
            # If not JSON, split by comma
            tags_list = [t.strip() for t in tags.split(',') if t.strip()]
    
    new_file = File(
        name=file.filename,
        original_name=file.filename,
        file_type=file.content_type,
        size=file_size,
        category=category,
        description=description,
        status=status if status else 'active',
        tags=tags_list,
        storage_path=str(file_path),
        url=str(file_path),
        folder_id=folder_uuid,
        owner_id=user_id,
        company_id=company_id
    )
    
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    print(f"Uploaded file - folder_id: {new_file.folder_id}")
    
    # Send file upload notification
    try:
        from app.services.notification_service import NotificationService
        from app.models.users import User
        uploader = db.query(User).filter(User.id == user_id).first()
        uploader_name = f"{uploader.first_name} {uploader.last_name}" if uploader else "Unknown User"
        
        NotificationService.notify_file_uploaded(
            db=db,
            file_name=new_file.name,
            uploader_id=user_id,
            uploader_name=uploader_name,
            company_id=company_id
        )
    except Exception as e:
        print(f"⚠️ Failed to send file upload notification: {e}")
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(company_id),
                entity_type="file",
                action="created",
                entity_id=str(new_file.id),
                data={
                    "id": str(new_file.id),
                    "name": new_file.name,
                    "file_type": new_file.file_type,
                    "size": new_file.size
                }
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return FileResponse(
        id=str(new_file.id),
        name=new_file.name,
        original_name=new_file.original_name,
        file_type=new_file.file_type,
        size=new_file.size,
        category=new_file.category,
        description=new_file.description,
        status=new_file.status if hasattr(new_file, 'status') else 'active',
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    file = db.query(File).filter(
        and_(
            File.id == uuid.UUID(file_id),
            File.company_id == company_id,
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
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(company_id),
                entity_type="file",
                action="updated",
                entity_id=str(file.id),
                data={
                    "id": str(file.id),
                    "name": file.name,
                    "file_type": file.file_type,
                    "size": file.size
                }
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return FileResponse(
        id=str(file.id),
        name=file.name,
        original_name=file.original_name,
        file_type=file.file_type,
        size=file.size,
        category=file.category,
        description=file.description,
        status=file.status if hasattr(file, 'status') else 'active',
        tags=file.tags or [],
        url=file.url,
        folder_id=str(file.folder_id) if file.folder_id else None,
        created_at=file.created_at.isoformat() if file.created_at else None,
        updated_at=file.updated_at.isoformat() if file.updated_at else None
    )


# Folder endpoints (MUST be before /{file_id} to avoid route conflicts)
@router.get("/folders", response_model=List[FolderResponse])
async def get_folders(
    parent_id: Optional[str] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all folders for company, optionally filtered by parent_id"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    query = db.query(Folder).filter(
        and_(
            Folder.company_id == company_id,
            Folder.is_deleted == False
        )
    )
    
    # Filter by parent_id if provided, otherwise get root folders (parent_id is None)
    if parent_id:
        query = query.filter(Folder.parent_id == uuid.UUID(parent_id))
    else:
        query = query.filter(Folder.parent_id == None)
    
    folders = query.order_by(Folder.name).all()
    
    def calculate_folder_size(folder_id: uuid.UUID) -> int:
        """Recursively calculate total size of folder including all nested folders and files"""
        # Get direct files size
        files_size = db.query(File).filter(
            and_(
                File.folder_id == folder_id,
                File.is_deleted == False
            )
        ).with_entities(File.size).all()
        
        total = sum(size[0] for size in files_size if size[0] is not None)
        
        # Get nested folders and recursively calculate their sizes
        nested_folders = db.query(Folder).filter(
            and_(
                Folder.parent_id == folder_id,
                Folder.is_deleted == False
            )
        ).all()
        
        for nested_folder in nested_folders:
            total += calculate_folder_size(nested_folder.id)
        
        return total
    
    result = []
    for folder in folders:
        folder_size = calculate_folder_size(folder.id)
        
        result.append(
            FolderResponse(
                id=str(folder.id),
                name=folder.name,
                description=folder.description,
                category=folder.category if hasattr(folder, 'category') else None,
                status=folder.status if hasattr(folder, 'status') else 'active',
                tags=folder.tags if hasattr(folder, 'tags') and folder.tags else [],
                parent_id=str(folder.parent_id) if folder.parent_id else None,
                size=folder_size if folder_size > 0 else None,
                created_at=folder.created_at.isoformat() if folder.created_at else None
            )
        )
    
    return result


@router.post("/folders", response_model=FolderResponse)
async def create_folder(
    folder_data: FolderCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new folder"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    parent_uuid = uuid.UUID(folder_data.parent_id) if folder_data.parent_id else None
    print(f"Creating folder '{folder_data.name}' with parent_id: {parent_uuid}")
    
    new_folder = Folder(
        name=folder_data.name,
        description=folder_data.description,
        category=folder_data.category,
        status=folder_data.status,
        tags=folder_data.tags,
        parent_id=parent_uuid,
        owner_id=user_id,
        company_id=company_id
    )
    
    db.add(new_folder)
    db.commit()
    db.refresh(new_folder)
    
    # Send folder creation notification
    try:
        from app.services.notification_service import NotificationService
        from app.models.users import User
        creator = db.query(User).filter(User.id == user_id).first()
        creator_name = f"{creator.first_name} {creator.last_name}" if creator else "Unknown User"
        
        NotificationService.notify_folder_created(
            db=db,
            folder_name=new_folder.name,
            creator_id=user_id,
            creator_name=creator_name,
            company_id=company_id
        )
    except Exception as e:
        print(f"⚠️ Failed to send folder creation notification: {e}")
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(company_id),
                entity_type="folder",
                action="created",
                entity_id=str(new_folder.id),
                data={
                    "id": str(new_folder.id),
                    "name": new_folder.name,
                    "parent_id": str(new_folder.parent_id) if new_folder.parent_id else None
                }
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return FolderResponse(
        id=str(new_folder.id),
        name=new_folder.name,
        description=new_folder.description,
        category=new_folder.category,
        status=new_folder.status,
        tags=new_folder.tags or [],
        parent_id=str(new_folder.parent_id) if new_folder.parent_id else None,
        created_at=new_folder.created_at.isoformat() if new_folder.created_at else None
    )


@router.patch("/folders/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: str,
    folder_update: dict,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a folder (e.g., move to different parent)"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    folder = db.query(Folder).filter(
        and_(
            Folder.id == uuid.UUID(folder_id),
            Folder.company_id == company_id,
            Folder.is_deleted == False
        )
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Update parent_id if provided
    if 'parent_id' in folder_update:
        parent_id = folder_update['parent_id']
        if parent_id:
            folder.parent_id = uuid.UUID(parent_id)
            print(f"Moving folder '{folder.name}' to parent: {parent_id}")
        else:
            folder.parent_id = None
            print(f"Moving folder '{folder.name}' to root")
    
    # Update other fields if provided
    if 'name' in folder_update:
        folder.name = folder_update['name']
    if 'description' in folder_update:
        folder.description = folder_update['description']
    if 'category' in folder_update:
        folder.category = folder_update['category']
    if 'status' in folder_update:
        folder.status = folder_update['status']
    if 'tags' in folder_update:
        folder.tags = folder_update['tags']
    
    folder.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(folder)
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(company_id),
                entity_type="folder",
                action="updated",
                entity_id=str(folder.id),
                data={
                    "id": str(folder.id),
                    "name": folder.name,
                    "parent_id": str(folder.parent_id) if folder.parent_id else None
                }
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return FolderResponse(
        id=str(folder.id),
        name=folder.name,
        description=folder.description,
        category=folder.category,
        status=folder.status,
        tags=folder.tags or [],
        parent_id=str(folder.parent_id) if folder.parent_id else None,
        created_at=folder.created_at.isoformat() if folder.created_at else None
    )


@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a folder"""
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    folder = db.query(Folder).filter(
        and_(
            Folder.id == uuid.UUID(folder_id),
            Folder.company_id == company_id,
            Folder.is_deleted == False
        )
    ).first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    folder_name = folder.name
    folder.is_deleted = True
    db.commit()
    
    # Send folder deletion notification
    try:
        from app.services.notification_service import NotificationService
        from app.models.users import User
        user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
        deleter = db.query(User).filter(User.id == user_id).first()
        deleter_name = f"{deleter.first_name} {deleter.last_name}" if deleter else "Unknown User"
        
        NotificationService.notify_folder_deleted(
            db=db,
            folder_name=folder_name,
            deleter_id=user_id,
            deleter_name=deleter_name,
            company_id=company_id
        )
    except Exception as e:
        print(f"⚠️ Failed to send folder deletion notification: {e}")
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(company_id),
                entity_type="folder",
                action="deleted",
                entity_id=str(folder_id),
                data=None
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return {"message": "Folder deleted successfully"}


@router.post("/", response_model=FileResponse)
async def create_file(
    file_data: FileCreate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new file record"""
    user_id = uuid.UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    new_file = File(
        name=file_data.name,
        original_name=file_data.name,
        category=file_data.category,
        tags=file_data.tags,
        folder_id=uuid.UUID(file_data.folder_id) if file_data.folder_id else None,
        contact_id=uuid.UUID(file_data.contact_id) if file_data.contact_id else None,
        deal_id=uuid.UUID(file_data.deal_id) if file_data.deal_id else None,
        owner_id=user_id,
        company_id=company_id
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    file = db.query(File).filter(
        and_(
            File.id == uuid.UUID(file_id),
            File.company_id == company_id,
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
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    
    if not company_id:
        raise HTTPException(status_code=403, detail="No company associated with user")
    
    file = db.query(File).filter(
        and_(
            File.id == uuid.UUID(file_id),
            File.company_id == company_id,
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
    """Delete a file - Only Managers and Admins"""
    context = get_tenant_context(current_user)
    company_id = uuid.UUID(current_user["company_id"]) if current_user.get("company_id") else None
    user_id = current_user.get('id')
    user_team_id = current_user.get('team_id')
    
    if not company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No company associated with user")
    
    file = db.query(File).filter(
        and_(
            File.id == uuid.UUID(file_id),
            File.company_id == company_id,
            File.is_deleted == False
        )
    ).first()
    
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    
    # Only Managers and Admins can delete files
    if context.is_super_admin():
        pass
    elif has_permission(current_user, Permission.VIEW_COMPANY_DATA):
        pass
    elif has_permission(current_user, Permission.VIEW_TEAM_DATA):
        if user_team_id:
            from app.models.users import User
            team_user_ids = [str(u.id) for u in db.query(User).filter(
                User.team_id == user_team_id,
                User.is_deleted == False
            ).all()]
            if str(file.uploaded_by) not in team_user_ids:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete files from your team members.")
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not assigned to a team.")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to delete files. Only managers and administrators can delete files.")
    
    file.is_deleted = True
    db.commit()
    
    # Send deletion notification
    try:
        from app.services.notification_service import NotificationService
        from app.models.users import User
        deleter = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        deleter_name = f"{deleter.first_name} {deleter.last_name}" if deleter else "Unknown User"
        
        NotificationService.notify_file_deleted(
            db=db,
            file_name=file.name,
            deleter_id=uuid.UUID(user_id),
            deleter_name=deleter_name,
            company_id=company_id
        )
    except Exception as e:
        print(f"⚠️ Failed to send file deletion notification: {e}")
    
    # Broadcast WebSocket event for real-time sync
    try:
        from app.services.websocket_manager import broadcast_entity_change
        import asyncio
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast_entity_change(
                company_id=str(company_id),
                entity_type="file",
                action="deleted",
                entity_id=str(file.id),
                data=None
            ))
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return {"message": "File deleted successfully"}


@router.post("/webhook/document-signed")
async def document_signed_webhook(
    document_data: dict,
    db: Session = Depends(get_db)
):
    """Webhook endpoint for document signature events (e.g., from DocuSign, HelloSign)"""
    try:
        document_id = document_data.get("document_id")
        signer_email = document_data.get("signer_email")
        contact_id = document_data.get("contact_id")
        owner_id = document_data.get("owner_id")
        
        print(f"📄 Document signed webhook received: {document_data}")
        
        # Trigger workflow for document_signed
        try:
            from app.services.workflow_executor import WorkflowExecutor
            from app.models.workflows import WorkflowTrigger
            from app.core.database import SessionLocal
            import asyncio
            import threading
            
            def run_workflow():
                workflow_db = SessionLocal()
                try:
                    print(f"🔥 Starting workflow trigger for document_signed")
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    executor = WorkflowExecutor(workflow_db)
                    trigger_data = {
                        "document_id": document_id,
                        "document_name": document_data.get("document_name", "Unknown"),
                        "signer_email": signer_email,
                        "contact_id": contact_id,
                        "owner_id": owner_id,
                        "signed_at": document_data.get("signed_at", datetime.utcnow().isoformat())
                    }
                    print(f"🔥 Trigger data: {trigger_data}")
                    result = loop.run_until_complete(executor.trigger_workflows(
                        WorkflowTrigger.DOCUMENT_SIGNED,
                        trigger_data,
                        owner_id
                    ))
                    print(f"🔥 Workflow trigger completed, executions: {len(result) if result else 0}")
                    loop.close()
                except Exception as e:
                    print(f"❌ Workflow execution error: {e}")
                    import traceback
                    traceback.print_exc()
                finally:
                    workflow_db.close()
            
            thread = threading.Thread(target=run_workflow, daemon=True)
            thread.start()
            print(f"🔥 Workflow thread started for document_signed")
        except Exception as workflow_error:
            print(f"❌ Workflow trigger error: {workflow_error}")
        
        return {"status": "ok", "message": "Document signature processed"}
        
    except Exception as e:
        print(f"Error processing document signature: {e}")
        return {"status": "error", "message": str(e)}
