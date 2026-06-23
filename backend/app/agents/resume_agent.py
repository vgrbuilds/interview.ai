import logging
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.config.settings import settings
from app.services.gemini_service import is_mock_gemini

logger = logging.getLogger("resume-agent")

class ResumeGapsAnalysis(BaseModel):
    skills: List[str] = Field(description="Identified technical and soft skills in the resume")
    gaps: List[str] = Field(description="Specific skill or experience gaps relative to high-performance roles")
    summary: str = Field(description="Brief professional summary of the candidate's background")

class ResumeAgent:
    def __init__(self):
        self.llm = None
        if not is_mock_gemini:
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-1.5-flash",
                    google_api_key=settings.GEMINI_API_KEY,
                    temperature=0.2
                )
            except Exception as e:
                logger.error(f"Failed to init Gemini in ResumeAgent: {e}")

    async def analyze_resume_profile(self, resume_text: str) -> Dict[str, Any]:
        """Analyzes a candidate's resume for skills, gaps, and professional summary."""
        if is_mock_gemini or not self.llm:
            return self._mock_analysis(resume_text)
        
        try:
            structured_llm = self.llm.with_structured_output(ResumeGapsAnalysis)
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are an expert technical recruiter. Analyze the candidate's resume and extract their technical/soft skills, key skill or experience gaps for a modern high-performance engineering role, and a professional summary."),
                ("user", "Resume Text:\n{resume_text}")
            ])
            chain = prompt | structured_llm
            result = await chain.ainvoke({"resume_text": resume_text})
            return {
                "skills": result.skills,
                "gaps": result.gaps,
                "summary": result.summary
            }
        except Exception as e:
            logger.error(f"Error in ResumeAgent analyze_resume_profile: {e}", exc_info=True)
            return self._mock_analysis(resume_text)

    def _mock_analysis(self, resume_text: str) -> Dict[str, Any]:
        logger.info("[MOCK] ResumeAgent analyzing profile...")
        return {
            "skills": ["Python", "SQL", "JavaScript", "FastAPI", "Git"],
            "gaps": ["Large scale distributed system design", "Kubernetes & CI/CD deployment experience", "Advanced data structures"],
            "summary": "Software engineer with solid backend foundations but lacking large-scale deployment experience."
        }

resume_agent = ResumeAgent()
