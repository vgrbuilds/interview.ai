import logging
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.config.settings import settings
from app.services.gemini_service import is_mock_gemini

logger = logging.getLogger("coach-agent")

class RoadmapStepSchema(BaseModel):
    step: int = Field(description="Step number (e.g. 1, 2, 3)")
    topic: str = Field(description="Title/focus topic of this preparation step")
    actions: List[str] = Field(description="List of action items the user should complete")
    resources: List[str] = Field(description="Suggested links, books, or documentation resources to study")

class OverallFeedbackSchema(BaseModel):
    technical_score: float = Field(description="Overall technical score on a 0.0 to 10.0 scale")
    communication_score: float = Field(description="Overall communication score on a 0.0 to 10.0 scale")
    strengths: List[str] = Field(description="List of overall strengths demonstrated across the interview")
    weaknesses: List[str] = Field(description="List of core improvement areas or weaknesses identified")
    roadmap: List[RoadmapStepSchema] = Field(description="Step-by-step preparation roadmap to guide the candidate's learning")

class CoachAgent:
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
                logger.error(f"Failed to init Gemini in CoachAgent: {e}")

    async def generate_coaching_report(
        self,
        company: str,
        role: str,
        questions_and_answers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Synthesizes the entire interview history to generate a scorecard and preparation roadmap."""
        if is_mock_gemini or not self.llm:
            return self._mock_coaching_report(company, role)

        try:
            structured_llm = self.llm.with_structured_output(OverallFeedbackSchema)
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are a Senior Career Coach and Engineering Mentor. "
                    "Analyze the candidate's interview transcript (questions, answers, scores, and feedback). "
                    "Determine their overall Technical Score and Communication Score (out of 10). "
                    "Extract general Strengths and Weaknesses, and compile a sequential, actionable preparation roadmap "
                    "to help them prepare for a real interview at the target company."
                )),
                ("user", "Company: {company}\nRole: {role}\nInterview Transcript:\n{transcript}")
            ])
            
            transcript_parts = []
            for qa in questions_and_answers:
                transcript_parts.append(
                    f"Question: {qa['question']}\n"
                    f"Answer: {qa.get('answer', 'N/A')}\n"
                    f"Score: {qa.get('score', 0)}\n"
                    f"Feedback: {qa.get('feedback', 'N/A')}\n"
                    "---"
                )
            
            chain = prompt | structured_llm
            result = await chain.ainvoke({
                "company": company,
                "role": role,
                "transcript": "\n".join(transcript_parts)
            })
            
            return {
                "technical_score": round(result.technical_score, 1),
                "communication_score": round(result.communication_score, 1),
                "strengths": result.strengths,
                "weaknesses": result.weaknesses,
                "roadmap": [
                    {
                        "step": step.step,
                        "topic": step.topic,
                        "actions": step.actions,
                        "resources": step.resources
                    }
                    for step in result.roadmap
                ]
            }
        except Exception as e:
            logger.error(f"Error in CoachAgent: {e}", exc_info=True)
            return self._mock_coaching_report(company, role)

    def _mock_coaching_report(self, company: str, role: str) -> Dict[str, Any]:
        logger.info("[MOCK] Generating coaching report...")
        return {
            "technical_score": 7.5,
            "communication_score": 8.0,
            "strengths": [
                "Solid understanding of REST API and FastAPI concepts.",
                "Good coding hygiene and awareness of testing principles.",
                "Clear and structured verbal communication style."
            ],
            "weaknesses": [
                "Lacks experience with system design at scale (caching, database replicas).",
                "Needs more confidence with deploying Docker structures and Kubernetes configurations."
            ],
            "roadmap": [
                {
                    "step": 1,
                    "topic": "System Design Foundations",
                    "actions": [
                        "Read Alex Xu's System Design Interview book.",
                        "Understand vertical vs horizontal scaling and CDN caching strategies."
                    ],
                    "resources": [
                        "System Design Primer (GitHub Repository)",
                        "FastAPI Background Tasks Documentation"
                    ]
                },
                {
                    "step": 2,
                    "topic": "Deployment and Containerization",
                    "actions": [
                        "Build and run multi-container applications using Docker Compose locally.",
                        "Learn about basic CI/CD pipelines using GitHub Actions."
                    ],
                    "resources": [
                        "Docker Official Documentation (Get Started)",
                        "FastAPI Docker Deployment Guides"
                    ]
                }
            ]
        }

coach_agent = CoachAgent()
