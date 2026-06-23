from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class ResumeResponse(BaseModel):
    id: int
    user_id: str
    file_url: str
    skills: Optional[Dict[str, Any]] = None  # Stores the JSON payload of skills, summary, gaps
    created_at: datetime

    class Config:
        from_attributes = True
