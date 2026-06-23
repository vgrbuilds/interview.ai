Overview
interview.ai is an AI-powered interview intelligence platform that researches target roles, simulates realistic interviews, analyzes candidate performance, and provides personalized career improvement insights. It leverages advanced LLM workflows to bridge the gap between candidates' current skills and industry-standard requirements, helping developers practice and prepare efficiently.

Features
* Informative AI-generated resume profile analysis that details core technical skills and highlights experience gaps relative to target engineering standards.
* Targeted company and role-specific interview simulation (Powered by LangGraph) that generates progressive difficulty questions tailored to the candidate's profile.
* Interactive chat room for realistic candidate Q&A practice with real-time answer evaluation.
* Comprehensive performance scorecard assessing both technical and communication performance.
* Actionable and personalized preparation roadmap offering a step-by-step timeline and recommended learning resources.
* Secure authentication and user profile management integrated with Supabase.

Tech stack
* Client application: React JS, Tailwind CSS v4, Ant Design
* Server application: FastAPI, Python (managed via uv)
* Intelligence layer: LangGraph, LangChain, Gemini (langchain-google-genai)
* Database: Supabase PostgreSQL (with automatic local SQLite fallback)
* Containerization and deployment: Docker, Render, Vercel

Setup guide
1. Clone & Configure: Clone the repository and copy/populate environment credentials:
   * Backend: Create `backend/.env` matching the schema in `backend/.env.example`.
   * Frontend: Create `frontend/.env` matching the schema in `frontend/.env.example` (configuring VITE_API_URL).
   * Root: Create a root `.env` file (see `.env.example` for details).
2. Run Containers: Start the multi-container environment (FastAPI backend and React frontend) using Docker Compose:
   ```bash
   docker compose up --build
   ```
3. Explore Dashboard: Navigate to `http://localhost:5173` in your browser.

Deployed links
* Frontend App (Vercel): https://interview-ai-demo.vercel.app
* Backend API (Render): https://interview-ai-api.onrender.com
