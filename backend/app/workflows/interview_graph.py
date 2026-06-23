import logging
from typing import Dict, Any, List, TypedDict, Optional
from langgraph.graph import StateGraph, START, END

from app.agents.resume_agent import resume_agent
from app.agents.research_agent import research_agent
from app.agents.interviewer_agent import interviewer_agent
from app.agents.coach_agent import coach_agent

logger = logging.getLogger("interview-graph")

# Define Graph State for Question Generation
class QuestionGenState(TypedDict):
    company: str
    role: str
    job_description: Optional[str]
    resume_text: Optional[str]
    
    # intermediate inputs/outputs
    skills: List[str]
    gaps: List[str]
    resume_summary: str
    
    company_culture: str
    role_requirements: List[str]
    suggested_topics: List[str]
    
    # final output
    questions: List[Dict[str, Any]]


# Define Graph State for Coaching
class CoachingState(TypedDict):
    company: str
    role: str
    questions_and_answers: List[Dict[str, Any]]
    
    # final output
    feedback: Dict[str, Any]


# Node Functions for Question Generation
async def resume_analysis_node(state: QuestionGenState) -> Dict[str, Any]:
    resume_text = state.get("resume_text")
    if not resume_text:
        return {
            "skills": [],
            "gaps": [],
            "resume_summary": "No resume provided."
        }
    
    result = await resume_agent.analyze_resume_profile(resume_text)
    return {
        "skills": result.get("skills", []),
        "gaps": result.get("gaps", []),
        "resume_summary": result.get("summary", "")
    }

async def company_research_node(state: QuestionGenState) -> Dict[str, Any]:
    company = state.get("company", "")
    role = state.get("role", "")
    job_description = state.get("job_description", "")
    
    result = await research_agent.research_role(company, role, job_description)
    return {
        "company_culture": result.get("company_culture", ""),
        "role_requirements": result.get("role_requirements", []),
        "suggested_topics": result.get("suggested_topics", [])
    }

async def generate_questions_node(state: QuestionGenState) -> Dict[str, Any]:
    company = state.get("company", "")
    role = state.get("role", "")
    resume_summary = state.get("resume_summary", "")
    resume_gaps = state.get("gaps", [])
    role_requirements = state.get("role_requirements", [])
    suggested_topics = state.get("suggested_topics", [])
    
    questions = await interviewer_agent.generate_questions(
        company=company,
        role=role,
        resume_summary=resume_summary,
        resume_gaps=resume_gaps,
        role_requirements=role_requirements,
        suggested_topics=suggested_topics
    )
    return {"questions": questions}


# Node Function for Coaching
async def evaluate_performance_node(state: CoachingState) -> Dict[str, Any]:
    company = state.get("company", "")
    role = state.get("role", "")
    questions_and_answers = state.get("questions_and_answers", [])
    
    feedback = await coach_agent.generate_coaching_report(company, role, questions_and_answers)
    return {"feedback": feedback}


# Compile Question Generation Graph
question_builder = StateGraph(QuestionGenState)
question_builder.add_node("resume_analysis", resume_analysis_node)
question_builder.add_node("company_research", company_research_node)
question_builder.add_node("generate_questions", generate_questions_node)

question_builder.add_edge(START, "resume_analysis")
question_builder.add_edge("resume_analysis", "company_research")
question_builder.add_edge("company_research", "generate_questions")
question_builder.add_edge("generate_questions", END)

question_graph = question_builder.compile()


# Compile Coaching Graph
coach_builder = StateGraph(CoachingState)
coach_builder.add_node("evaluate_performance", evaluate_performance_node)

coach_builder.add_edge(START, "evaluate_performance")
coach_builder.add_edge("evaluate_performance", END)

coaching_graph = coach_builder.compile()


class InterviewWorkflow:
    @staticmethod
    async def create_interview_questions(
        company: str,
        role: str,
        job_description: Optional[str] = None,
        resume_text: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Orchestrates question generation using LangGraph."""
        inputs = {
            "company": company,
            "role": role,
            "job_description": job_description,
            "resume_text": resume_text,
            "skills": [],
            "gaps": [],
            "resume_summary": "",
            "company_culture": "",
            "role_requirements": [],
            "suggested_topics": [],
            "questions": []
        }
        
        try:
            result = await question_graph.ainvoke(inputs)
            return result.get("questions", [])
        except Exception as e:
            logger.error(f"Error executing QuestionGen Graph: {e}", exc_info=True)
            # Safe fallback if graph execution fails
            from app.agents.interviewer_agent import interviewer_agent
            return interviewer_agent._mock_questions(role, company)

    @staticmethod
    async def compile_coaching_report(
        company: str,
        role: str,
        questions_and_answers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Orchestrates coaching feedback compilation using LangGraph."""
        inputs = {
            "company": company,
            "role": role,
            "questions_and_answers": questions_and_answers,
            "feedback": {}
        }
        
        try:
            result = await coaching_graph.ainvoke(inputs)
            return result.get("feedback", {})
        except Exception as e:
            logger.error(f"Error executing Coaching Graph: {e}", exc_info=True)
            from app.agents.coach_agent import coach_agent
            return coach_agent._mock_coaching_report(company, role)

interview_workflow = InterviewWorkflow()
