from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class InterviewCreate(BaseModel):
    company: str
    role: str
    job_description: Optional[str] = None
    resume_id: Optional[int] = None

class QuestionResponse(BaseModel):
    id: int
    interview_id: int
    question: str
    difficulty: str
    answer: Optional[str] = None
    score: Optional[float] = None
    feedback: Optional[str] = None

    class Config:
        from_attributes = True

class FeedbackResponse(BaseModel):
    id: int
    interview_id: int
    technical_score: float
    communication_score: float
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    roadmap: Optional[List[Dict[str, Any]]] = None

    class Config:
        from_attributes = True

class InterviewResponse(BaseModel):
    id: int
    user_id: str
    company: str
    role: str
    job_description: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class InterviewDetailResponse(InterviewResponse):
    questions: List[QuestionResponse] = []
    feedback: Optional[FeedbackResponse] = None

    class Config:
        from_attributes = True

class AnswerSubmit(BaseModel):
    answer: str
