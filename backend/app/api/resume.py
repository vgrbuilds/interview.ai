from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.database.models import User, Resume
from app.api.auth import get_current_user
from app.services.storage_service import storage_service
from app.services.pdf_service import pdf_service
from app.services.gemini_service import gemini_service
from app.schemas.resume import ResumeResponse

router = APIRouter(prefix="/resume", tags=["resume"])

@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify file extension is PDF
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported."
        )
        
    try:
        file_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file bytes: {str(e)}"
        )
        
    # 1. Upload file and get URL
    try:
        file_url = await storage_service.upload_resume(file.filename, file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file to storage: {str(e)}"
        )
        
    # 2. Extract text from PDF
    try:
        parsed_text = pdf_service.extract_text_from_bytes(file_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse PDF text: {str(e)}"
        )
        
    # 3. Analyze with Gemini
    try:
        analysis_result = await gemini_service.analyze_resume(parsed_text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze resume content: {str(e)}"
        )
        
    # 4. Save to Database
    db_resume = Resume(
        user_id=current_user.id,
        file_url=file_url,
        parsed_text=parsed_text,
        skills=analysis_result  # Storing the complete dictionary (skills, summary, gaps)
    )
    
    try:
        db.add(db_resume)
        await db.commit()
        await db.refresh(db_resume)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save resume details to database: {str(e)}"
        )
        
    return ResumeResponse(
        id=db_resume.id,
        user_id=db_resume.user_id,
        file_url=db_resume.file_url,
        skills=db_resume.skills,
        created_at=db_resume.created_at
    )
