import logging
from typing import Dict, Any
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from app.config.settings import settings
from app.services.gemini_service import is_mock_gemini

logger = logging.getLogger("evaluator-agent")

class EvaluationSchema(BaseModel):
    score: float = Field(description="Numerical score for the answer from 0.0 (poor) to 10.0 (perfect)")
    feedback: str = Field(description="Detailed feedback analyzing strengths and areas of improvement for the answer")

class EvaluatorAgent:
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
                logger.error(f"Failed to init Gemini in EvaluatorAgent: {e}")

    async def evaluate_answer(self, question: str, difficulty: str, answer: str) -> Dict[str, Any]:
        """Evaluates a single question answer and returns score (0-10) and feedback."""
        if is_mock_gemini or not self.llm:
            return self._mock_evaluation(question, answer)

        try:
            structured_llm = self.llm.with_structured_output(EvaluationSchema)
            prompt = ChatPromptTemplate.from_messages([
                ("system", (
                    "You are a strict, constructive Technical Interview Evaluator. "
                    "Rate the user's answer to the given question on a scale from 0.0 to 10.0. "
                    "Provide objective feedback, highlighting what was good and what was missing "
                    "or could be improved. Be honest and direct. "
                    "CRITICAL: If the user's answer is completely irrelevant, uncooperative, contains "
                    "low-effort filler (e.g., 'i don't care', 'idk', 'whatever', 'skip'), or is garbage/nonsense, "
                    "you MUST assign a score of 0.0 to 1.0 and state that the response is uncooperative or lacks effort."
                )),
                ("user", "Question (Difficulty: {difficulty}): {question}\nUser's Answer: {answer}")
            ])
            
            chain = prompt | structured_llm
            result = await chain.ainvoke({
                "question": question,
                "difficulty": difficulty,
                "answer": answer
            })
            
            return {
                "score": round(result.score, 1),
                "feedback": result.feedback
            }
        except Exception as e:
            logger.error(f"Error in EvaluatorAgent: {e}", exc_info=True)
            return self._mock_evaluation(question, answer)

    def _mock_evaluation(self, question: str, answer: str) -> Dict[str, Any]:
        logger.info("[MOCK] Evaluating answer...")
        ans_lower = answer.strip().lower()
        low_effort_keywords = [
            "i don't care", "don't care", "idk", "i don't know", "don't know", 
            "whatever", "skip", "nothing", "no idea", "nonsense", "garbage"
        ]
        
        # Check for uncooperative or extremely low-effort responses
        if any(keyword in ans_lower for keyword in low_effort_keywords) or len(ans_lower) < 6:
            return {
                "score": 1.0,
                "feedback": "The response is uncooperative, extremely brief, or shows a lack of interest. A professional interview requires structuring thoughtful answers."
            }
            
        # basic score heuristic based on length for standard answers
        length = len(answer.strip())
        if length < 15:
            score = 3.0
            feedback = "The response is too brief and lacks technical depth. Try to structure your answer using the STAR method."
        elif length < 40:
            score = 5.5
            feedback = "Good start, but the answer lacks concrete examples and details. Elaborate on the specific technologies and architectural decisions."
        else:
            score = 8.0
            feedback = "Strong response with clear explanations of the concepts. Mentions key architectural considerations and relevant implementation patterns."
            
        return {
            "score": score,
            "feedback": feedback
        }

evaluator_agent = EvaluatorAgent()
