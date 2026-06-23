import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database.session import get_db
from app.database.models import User, Resume, Interview, Question, Feedback
from app.api.auth import get_current_user
from app.schemas.interview import (
    InterviewCreate,
    InterviewResponse,
    InterviewDetailResponse,
    AnswerSubmit,
    QuestionResponse,
    FeedbackResponse
)
from app.workflows.interview_graph import interview_workflow
from app.agents.evaluator_agent import evaluator_agent

logger = logging.getLogger("interview-api")
router = APIRouter(prefix="/interview", tags=["interview"])

@router.post("/create", response_model=InterviewDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_interview(
    body: InterviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Initializes a new simulated interview, generates questions via LangGraph, and saves to DB."""
    # 1. Fetch resume if provided
    resume_text = None
    if body.resume_id:
        stmt = select(Resume).where(Resume.id == body.resume_id, Resume.user_id == current_user.id)
        res = await db.execute(stmt)
        db_resume = res.scalars().first()
        if not db_resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume not found or access denied."
            )
        resume_text = db_resume.parsed_text

    # 2. Create Interview entry
    db_interview = Interview(
        user_id=current_user.id,
        company=body.company,
        role=body.role,
        job_description=body.job_description,
        status="in_progress"
    )
    db.add(db_interview)
    try:
        await db.commit()
        await db.refresh(db_interview)
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to create interview record: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize interview database entry."
        )

    # 3. Generate Questions using LangGraph workflow
    try:
        generated_questions = await interview_workflow.create_interview_questions(
            company=body.company,
            role=body.role,
            job_description=body.job_description,
            resume_text=resume_text
        )
    except Exception as e:
        logger.error(f"Failed to run question generation workflow: {e}")
        # Delete interview so we don't leave orphaned pending state
        await db.delete(db_interview)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate interview questions."
        )

    # 4. Save generated questions to database
    db_questions = []
    for q in generated_questions:
        db_q = Question(
            interview_id=db_interview.id,
            question=q["question"],
            difficulty=q["difficulty"]
        )
        db.add(db_q)
        db_questions.append(db_q)

    try:
        await db.commit()
        # Refresh interview with loaded relationships
        stmt = (
            select(Interview)
            .where(Interview.id == db_interview.id)
            .options(selectinload(Interview.questions), selectinload(Interview.feedback))
        )
        res = await db.execute(stmt)
        db_interview = res.scalars().first()
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to commit interview questions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store generated interview questions."
        )

    return db_interview


@router.get("/{id}", response_model=InterviewDetailResponse)
async def get_interview(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves full interview details, including questions and feedback."""
    stmt = (
        select(Interview)
        .where(Interview.id == id, Interview.user_id == current_user.id)
        .options(selectinload(Interview.questions), selectinload(Interview.feedback))
    )
    res = await db.execute(stmt)
    db_interview = res.scalars().first()
    
    if not db_interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found."
        )
        
    return db_interview


@router.post("/{id}/answer", response_model=QuestionResponse)
async def submit_answer(
    id: int,
    body: AnswerSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submits answer for the next unanswered question, evaluates it, and advances state."""
    # 1. Fetch interview with questions
    stmt = (
        select(Interview)
        .where(Interview.id == id, Interview.user_id == current_user.id)
        .options(selectinload(Interview.questions))
    )
    res = await db.execute(stmt)
    db_interview = res.scalars().first()
    
    if not db_interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found."
        )
        
    if db_interview.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview is already completed."
        )

    # 2. Identify the first unanswered question
    target_question = None
    for q in db_interview.questions:
        if q.answer is None:
            target_question = q
            break
            
    if not target_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All questions have already been answered."
        )

    # 3. Evaluate answer using the Evaluator Agent
    try:
        eval_result = await evaluator_agent.evaluate_answer(
            question=target_question.question,
            difficulty=target_question.difficulty,
            answer=body.answer
        )
    except Exception as e:
        logger.error(f"Error evaluating answer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to evaluate the submitted answer."
        )

    # 4. Save question answer, score, and feedback
    target_question.answer = body.answer
    target_question.score = eval_result["score"]
    target_question.feedback = eval_result["feedback"]

    try:
        db.add(target_question)
        await db.commit()
        await db.refresh(target_question)
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to save question response: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save answer details to database."
        )

    # 5. Check if all questions are now answered
    all_answered = all(q.answer is not None for q in db_interview.questions)
    if all_answered:
        # Update interview status
        db_interview.status = "completed"
        db.add(db_interview)
        await db.commit()

        # Compile coaching report via LangGraph
        try:
            qa_list = [
                {
                    "question": q.question,
                    "answer": q.answer,
                    "score": q.score,
                    "feedback": q.feedback
                }
                for q in db_interview.questions
            ]
            report = await interview_workflow.compile_coaching_report(
                company=db_interview.company,
                role=db_interview.role,
                questions_and_answers=qa_list
            )
            
            # Save feedback/roadmap to DB
            db_feedback = Feedback(
                interview_id=db_interview.id,
                technical_score=report["technical_score"],
                communication_score=report["communication_score"],
                strengths=report["strengths"],
                weaknesses=report["weaknesses"],
                roadmap=report["roadmap"]
            )
            db.add(db_feedback)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to generate and save overall coaching feedback: {e}")
            # Ensure database consistency even if coaching generation fails (can regenerate or fallback)
            await db.rollback()

    return target_question


@router.get("/{id}/report", response_model=FeedbackResponse)
async def get_report(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves compiled scorecard and roadmap for a completed interview."""
    stmt = (
        select(Feedback)
        .join(Interview)
        .where(Interview.id == id, Interview.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    db_feedback = res.scalars().first()
    
    if not db_feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report feedback not found. Make sure the interview is completed."
        )
        
    return db_feedback
