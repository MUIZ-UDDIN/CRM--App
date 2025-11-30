"""
Teams API for managing teams and team members
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, UUID4

from app.core.database import get_db
from app.core.security import get_current_user, get_current_active_user
from app.models import User, Team, Company
from app.middleware.tenant import require_company_admin, require_sales_manager, validate_team_access
from app.middleware.permissions import has_permission
from app.models.permissions import Permission

router = APIRouter(tags=["Teams"])


class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None


class TeamCreate(TeamBase):
    pass


class TeamUpdate(TeamBase):
    pass


class TeamMemberAdd(BaseModel):
    user_id: UUID4


class TeamResponse(TeamBase):
    id: UUID4
    company_id: UUID4
    team_lead_id: Optional[UUID4] = None
    
    class Config:
        orm_mode = True


class TeamMemberResponse(BaseModel):
    id: UUID4
    email: str
    first_name: str
    last_name: str
    user_role: str
    
    class Config:
        orm_mode = True


@router.post("/", response_model=TeamResponse)
async def create_team(
    team: TeamCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Create a new team
    Only Company Admin or Super Admin can create teams
    """
    if not has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot create teams"
        )
    
    # Get company_id from current user
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company ID not found"
        )
    
    # Create team
    db_team = Team(
        name=team.name,
        description=team.description,
        company_id=company_id,
        team_lead_id=None  # No team lead initially
    )
    
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    
    return db_team


@router.get("/", response_model=List[TeamResponse])
async def get_teams(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get teams based on user role:
    - Super Admin: all teams
    - Company Admin: all company teams
    - Sales Manager/Rep: only their own team
    """
    user_role = current_user.get("role") or current_user.get("user_role")
    company_id = current_user.get("company_id")
    user_team_id = current_user.get("team_id")
    
    # Super admin can see all teams
    if user_role and user_role.lower() == "super_admin":
        teams = db.query(Team).all()
        return teams
    
    # Company users must have a company
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company ID not found"
        )
    
    # Company Admin sees all company teams
    if user_role and user_role.lower() == "company_admin":
        teams = db.query(Team).filter(Team.company_id == company_id).all()
        return teams
    
    # Sales Managers and Sales Reps see only their own team
    if user_team_id:
        teams = db.query(Team).filter(
            Team.company_id == company_id,
            Team.id == user_team_id
        ).all()
        return teams
    
    # Users without a team see no teams
    return []


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get a specific team
    """
    # Get team
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Validate access
    validate_team_access(current_user, team_id)
    
    return team


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: UUID4,
    team_update: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update a team
    Only Company Admin or Team Lead can update team
    """
    # Get team
    db_team = db.query(Team).filter(Team.id == team_id).first()
    if not db_team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Validate access
    user_role = current_user.get("role")
    user_id = current_user.get("id")
    
    # Check if user is company admin, super admin, or team lead
    if user_role.lower() not in ["super_admin", "company_admin"] and str(db_team.team_lead_id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company admin or team lead can update team"
        )
    
    # Update team
    db_team.name = team_update.name
    db_team.description = team_update.description
    
    db.commit()
    db.refresh(db_team)
    
    return db_team


@router.delete("/{team_id}")
async def delete_team(
    team_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Delete a team
    Only Company Admin or Super Admin can delete teams
    """
    if not has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot delete teams"
        )
    
    # Get team
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Check if team has members (both regular and super admin)
    regular_members = db.query(User).filter(User.team_id == team_id).all()
    
    from app.models.users import user_teams
    super_admin_count = db.execute(
        user_teams.select().where(user_teams.c.team_id == team_id)
    ).fetchall()
    
    if regular_members or super_admin_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete team with members. Remove members first."
        )
    
    # Delete team
    db.delete(team)
    db.commit()
    
    return {"message": "Team deleted successfully"}


@router.post("/{team_id}/lead/{user_id}")
async def set_team_lead(
    team_id: UUID4,
    user_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Set team lead
    Only Company Admin or Super Admin can set team lead
    """
    if not has_permission(current_user, Permission.MANAGE_COMPANY_USERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Cannot set team lead"
        )
    
    # Get team
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is in team
    if user.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be a member of the team"
        )
    
    # Set user as team lead and update role to sales_manager
    # BUT: Don't change role if user is super_admin or company_admin
    team.team_lead_id = user_id
    if user.user_role not in ["super_admin", "company_admin"]:
        user.user_role = "sales_manager"
    
    db.commit()
    db.refresh(team)
    
    return {"message": "Team lead set successfully"}


@router.get("/{team_id}/members", response_model=List[TeamMemberResponse])
async def get_team_members(
    team_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get all members of a team
    """
    # Get team
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Validate access
    validate_team_access(current_user, team_id)
    
    # Get team members
    # Regular users: from team_id field
    regular_members = db.query(User).filter(User.team_id == team_id).all()
    
    # Super admins: from user_teams table
    from app.models.users import user_teams
    super_admin_ids = db.execute(
        user_teams.select().where(user_teams.c.team_id == team_id)
    ).fetchall()
    
    super_admin_members = []
    if super_admin_ids:
        user_ids = [row.user_id for row in super_admin_ids]
        super_admin_members = db.query(User).filter(User.id.in_(user_ids)).all()
    
    # Combine both lists (avoid duplicates)
    all_members = regular_members + [m for m in super_admin_members if m not in regular_members]
    
    return all_members


@router.post("/{team_id}/members")
async def add_team_member(
    team_id: UUID4,
    member: TeamMemberAdd,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Add a user to a team
    Only Company Admin, Super Admin, or Team Lead can add members
    """
    # Get team
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Validate access
    user_role = current_user.get("role")
    user_id = current_user.get("id")
    
    # Check if user is company admin, super admin, or team lead
    if user_role.lower() not in ["super_admin", "company_admin"] and str(team.team_lead_id) != str(user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company admin or team lead can add members"
        )
    
    # Get user to add
    user = db.query(User).filter(User.id == member.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is already in a team
    # EXCEPTION: Super admin can be in multiple teams
    if user.team_id and user.user_role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already in a team"
        )
    
    # Check if user is in the same company
    # EXCEPTION: Super admin can join any team from any company
    if user.user_role != "super_admin" and str(user.company_id) != str(team.company_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be in the same company as the team"
        )
    
    # Add user to team
    if user.user_role == "super_admin":
        # Super admin: Add to user_teams table (many-to-many)
        # Check if already in this team
        from app.models.users import user_teams
        existing = db.execute(
            user_teams.select().where(
                user_teams.c.user_id == member.user_id,
                user_teams.c.team_id == team_id
            )
        ).first()
        
        if not existing:
            db.execute(
                user_teams.insert().values(
                    user_id=member.user_id,
                    team_id=team_id
                )
            )
    else:
        # Regular users: Use team_id field (single team)
        user.team_id = team_id
        
        # If not already a sales_manager, set as sales_rep
        # IMPORTANT: Never change super_admin or company_admin roles
        if user.user_role not in ["super_admin", "company_admin", "sales_manager"]:
            user.user_role = "sales_rep"
    
    db.commit()
    
    return {"message": "User added to team successfully"}


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: UUID4,
    user_id: UUID4,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Remove a user from a team
    Only Company Admin, Super Admin, or Team Lead can remove members
    """
    # Get team
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    # Validate access
    user_role = current_user.get("role")
    current_user_id = current_user.get("id")
    
    # Check if user is company admin, super admin, or team lead
    if user_role.lower() not in ["super_admin", "company_admin"] and str(team.team_lead_id) != str(current_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company admin or team lead can remove members"
        )
    
    # Get user to remove
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if user is in the team (check both team_id and user_teams)
    from app.models.users import user_teams
    in_user_teams = db.execute(
        user_teams.select().where(
            user_teams.c.user_id == user_id,
            user_teams.c.team_id == team_id
        )
    ).first()
    
    if user.team_id != team_id and not in_user_teams:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not in this team"
        )
    
    # If user is the team lead, remove team lead designation
    if str(team.team_lead_id) == str(user_id):
        team.team_lead_id = None
    
    # Remove user from team
    if user.user_role == "super_admin" and in_user_teams:
        # Super admin: Remove from user_teams table
        db.execute(
            user_teams.delete().where(
                user_teams.c.user_id == user_id,
                user_teams.c.team_id == team_id
            )
        )
    else:
        # Regular user: Clear team_id field
        user.team_id = None
        
        # If user was a sales_rep, reset to company_user
        if user.user_role == "sales_rep":
            user.user_role = "company_user"
    
    db.commit()
    
    return {"message": "User removed from team successfully"}
