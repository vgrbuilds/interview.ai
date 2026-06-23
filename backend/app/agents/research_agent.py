import logging
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.config.settings import settings
from app.services.gemini_service import is_mock_gemini

logger = logging.getLogger("research-agent")

class CompanyResearch(BaseModel):
    company_culture: str = Field(description="Summary of the target company's values, mission, and culture")
    role_requirements: List[str] = Field(description="Key technical and professional requirements for this role at this company")
    suggested_topics: List[str] = Field(description="Recommended interview evaluation topics (e.g. System Design, Coding, Leadership Principles)")

class ResearchAgent:
    def __init__(self):
        self.llm = None
        if not is_mock_gemini:
            try:
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-1.5-flash",
                    google_api_key=settings.GEMINI_API_KEY,
                    temperature=0.3
                )
            except Exception as e:
                logger.error(f"Failed to init Gemini in ResearchAgent: {e}")

    async def research_role(self, company: str, role: str, job_description: str = "") -> Dict[str, Any]:
        """Researches target company expectations and interview style for a specific role."""
        if is_mock_gemini or not self.llm:
            return self._mock_research(company, role, job_description)
            
        try:
            structured_llm = self.llm.with_structured_output(CompanyResearch)
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are an expert recruitment researcher. Research and analyze the expectations, interview focus areas, culture, and core competencies of the specified company for the given job role."),
                ("user", "Company: {company}\nRole: {role}\nJob Description: {job_description}")
            ])
            chain = prompt | structured_llm
            result = await chain.ainvoke({
                "company": company,
                "role": role,
                "job_description": job_description or "N/A"
            })
            return {
                "company_culture": result.company_culture,
                "role_requirements": result.role_requirements,
                "suggested_topics": result.suggested_topics
            }
        except Exception as e:
            logger.error(f"Error in ResearchAgent: {e}", exc_info=True)
            return self._mock_research(company, role, job_description)

    def _mock_research(self, company: str, role: str, job_description: str = "") -> Dict[str, Any]:
        logger.info(f"[MOCK] Researching {role} at {company}...")
        return {
            "company_culture": f"Focused on high ownership, engineering excellence, and customer success at {company}.",
            "role_requirements": [
                f"Strong proficiency in backend engineering relevant to a {role} role.",
                "Familiarity with clean code principles, testing, and API design.",
                "Collabrative communication style."
            ],
            "suggested_topics": ["Data Structures", "Web Frameworks / APIs", "System Design Basics", "Behavioral & Cultural Fit"]
        }

research_agent = ResearchAgent()
