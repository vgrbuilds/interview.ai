import logging
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.config.settings import settings
from app.services.gemini_service import is_mock_gemini

logger = logging.getLogger("interviewer-agent")

class QuestionSchema(BaseModel):
    question: str = Field(description="The interview question text")
    difficulty: str = Field(description="Difficulty level: easy, medium, or hard")

class QuestionsListSchema(BaseModel):
    questions: List[QuestionSchema] = Field(description="List of customized interview questions")

class InterviewerAgent:
    def __init__(self):
        self.llm = None
        if not is_mock_gemini:
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-1.5-flash",
                    google_api_key=settings.GEMINI_API_KEY,
                    temperature=0.7
                )
            except Exception as e:
                logger.error(f"Failed to init Gemini in InterviewerAgent: {e}")

    async def generate_questions(
        self,
        company: str,
        role: str,
        resume_summary: str,
        resume_gaps: List[str],
        role_requirements: List[str],
        suggested_topics: List[str]
    ) -> List[Dict[str, Any]]:
        """Generates 5 tailored interview questions combining resume profile, gaps, and company expectations."""
        if is_mock_gemini or not self.llm:
            return self._mock_questions(role, company)

        try:
            structured_llm = self.llm.with_structured_output(QuestionsListSchema)
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are an elite Technical Interviewer. Your task is to generate exactly 5 distinct, high-quality interview questions. "
                    "These questions must: "
                    "1. Match the company's culture and role requirements. "
                    "2. Probe the candidate's core skills and specifically target their identified resume gaps. "
                    "3. Cover a progressive difficulty range: 1 easy, 3 medium, 1 hard. "
                    "4. Include a mix of technical coding/system-design and behavioral/situational questions."
                )),
                ("user", (
                    "Company: {company}\n"
                    "Role: {role}\n"
                    "Candidate Summary: {resume_summary}\n"
                    "Candidate Skill Gaps: {resume_gaps}\n"
                    "Company Role Requirements: {role_requirements}\n"
                    "Interview Evaluation Topics: {suggested_topics}"
                ))
            ])
            
            chain = prompt | structured_llm
            result = await chain.ainvoke({
                "company": company,
                "role": role,
                "resume_summary": resume_summary,
                "resume_gaps": ", ".join(resume_gaps),
                "role_requirements": ", ".join(role_requirements),
                "suggested_topics": ", ".join(suggested_topics)
            })
            
            return [
                {"question": q.question, "difficulty": q.difficulty}
                for q in result.questions
            ]
        except Exception as e:
            logger.error(f"Error in InterviewerAgent: {e}", exc_info=True)
            return self._mock_questions(role, company)

    def _mock_questions(self, role: str, company: str) -> List[Dict[str, Any]]:
        logger.info("[MOCK] Generating questions...")
        return [
            {
                "question": f"Can you explain your experience building backend services for a {role} role, and how you design APIs?",
                "difficulty": "easy"
            },
            {
                "question": "How do you handle authentication and database schema migrations in a FastAPI application?",
                "difficulty": "medium"
            },
            {
                "question": "Describe a time you encountered a database performance bottleneck. How did you diagnose and resolve it?",
                "difficulty": "medium"
            },
            {
                "question": "If you need to deploy this system to handle 10,000 requests per second, how would you design the architecture and database caching?",
                "difficulty": "hard"
            },
            {
                "question": f"Why do you want to join {company} specifically, and how do you handle feedback on code reviews?",
                "difficulty": "medium"
            }
        ]

interviewer_agent = InterviewerAgent()
