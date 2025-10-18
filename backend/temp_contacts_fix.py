# Replace the Contact response model in contacts.py
class Contact(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    status: str
    lead_score: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
