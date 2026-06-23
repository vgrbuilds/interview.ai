import logging
import json
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.config.settings import settings

logger = logging.getLogger("gemini-service")

# Check if we have a valid Gemini API key
is_mock_gemini = not settings.GEMINI_API_KEY or "fake" in settings.GEMINI_API_KEY or "your_key" in settings.GEMINI_API_KEY

class ResumeAnalysis(BaseModel):
    skills: List[str] = Field(description="List of technical and soft skills identified in the resume")
    summary: str = Field(description="A concise professional summary of the candidate")
    experience_summary: str = Field(description="Summary of candidate's professional experience and roles")
    gaps: List[str] = Field(description="Identified gaps in candidate's profile relative to top-tier tech roles")


class GeminiService:
    def __init__(self):
        self.llm = None
        if not is_mock_gemini:
            try:
                # We use gemini-1.5-flash as it is extremely fast and cost-effective
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-1.5-flash",
                    google_api_key=settings.GEMINI_API_KEY,
                    temperature=0.2
                )
                logger.info("Gemini LLM initialized successfully.")
            except Exception as e:
                logger.error("Failed to initialize Gemini LLM: %s. Falling back to Mock Gemini.", str(e))
                self.llm = None
        else:
            logger.warning("Running with Mock Gemini Service. Set GEMINI_API_KEY for real AI evaluation.")

    async def analyze_resume(self, resume_text: str) -> Dict[str, Any]:
        """Parse resume text using Gemini and extract skills, summary, experience, and gaps."""
        if is_mock_gemini or self.llm is None:
            return self._mock_resume_analysis(resume_text)
            
        try:
            structured_llm = self.llm.with_structured_output(ResumeAnalysis)
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are an expert AI Resume Analyzer and Technical Recruiter. "
                    "Analyze the provided resume text and extract structured information, focusing on "
                    "identifying core skills, professional summary, experience summary, and any potential "
                    "gaps in skills or experience relative to top-tier software engineering standards (e.g. Google SWE)."
                )),
                ("user", "Resume Text:\n{resume_text}")
            ])
            
            chain = prompt | structured_llm
            result = await chain.ainvoke({"resume_text": resume_text})
            
            return {
                "skills": result.skills,
                "summary": result.summary,
                "experience_summary": result.experience_summary,
                "gaps": result.gaps
            }
        except Exception as e:
            logger.error("Error calling Gemini API for resume analysis: %s", str(e), exc_info=True)
            return self._mock_resume_analysis(resume_text)

    def _mock_resume_analysis(self, resume_text: str) -> Dict[str, Any]:
        """Fallback mock resume analysis for local testing/placeholder keys."""
        logger.info("[MOCK GEMINI] Analyzing resume...")
        
        # Simple heuristics to find common keywords for mock skills
        heuristics_skills = ["Python", "JavaScript", "React", "Node.js", "Docker", "SQL", "Git", "HTML", "CSS", "AWS"]
        detected_skills = []
        for skill in heuristics_skills:
            if skill.lower() in resume_text.lower():
                detected_skills.append(skill)
                
        if not detected_skills:
            detected_skills = ["Software Engineering", "Full-Stack Development", "Problem Solving"]
            
        return {
            "skills": detected_skills,
            "summary": "Mock Profile: Enthusiastic software developer with hands-on experience in building web applications.",
            "experience_summary": "Mock Experience: Worked on various projects utilizing technologies such as " + ", ".join(detected_skills[:3]) + ".",
            "gaps": [
                "System Design experience at scale",
                "Advanced data structures and algorithms (LeetCode style)",
                "Cloud infrastructure orchestration (e.g. Kubernetes, Terraform)"
            ]
        }

gemini_service = GeminiService()
