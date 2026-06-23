import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Spin, message, Alert } from 'antd';
import { LeftOutlined, DashboardOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import client from '../api/client';
import InterviewChat from '../components/InterviewChat';

export default function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [interview, setInterview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  useEffect(() => {
    fetchInterviewDetails();
  }, [id]);

  const fetchInterviewDetails = async () => {
    setLoading(true);
    try {
      const response = await client.get(`/interview/${id}`);
      const data = response.data;
      setInterview(data);
      setQuestions(data.questions || []);
      
      // Determine the current active question (first unanswered)
      const unanswered = data.questions?.find(q => q.answer === null);
      setCurrentQuestion(unanswered || null);

      if (data.status === 'completed') {
        message.info('This simulation is already completed.');
        navigate(`/report/${id}`);
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to load interview simulator.');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async (answer) => {
    setSubmitting(true);
    try {
      const response = await client.post(`/interview/${id}/answer`, { answer });
      const gradedQuestion = response.data;
      
      // Update local questions list
      const updatedQuestions = questions.map(q => 
        q.id === gradedQuestion.id ? gradedQuestion : q
      );
      setQuestions(updatedQuestions);

      // Fetch fresh interview details to update status and see if completed
      const freshRes = await client.get(`/interview/${id}`);
      const freshData = freshRes.data;
      setInterview(freshData);

      // Check if there is another unanswered question
      const nextUnanswered = freshData.questions?.find(q => q.answer === null);
      setCurrentQuestion(nextUnanswered || null);

      if (freshData.status === 'completed') {
        message.success('Interview simulation completed!');
        // Small delay to let user see final feedback state before redirect
        setTimeout(() => {
          navigate(`/report/${id}`);
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      message.error('Failed to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spin size="large" tip={<span className="text-violet-400 mt-2 font-medium">Entering simulation room...</span>} />
      </div>
    );
  }

  const answeredCount = questions.filter(q => q.answer !== null).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] rounded-full bg-violet-600/5 blur-[90px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-8 z-10 relative">
        <div className="flex items-center gap-3">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 h-9 px-3 rounded-lg flex items-center"
          >
            Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">Simulation Room</h1>
            <p className="text-slate-400 text-xs mt-1">{interview?.role} at {interview?.company}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-slate-500 text-xs uppercase font-semibold">Active Session</span>
          <div className="text-violet-400 font-mono font-bold text-sm mt-0.5">ID: #{interview?.id}</div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 z-10 relative">
        {/* Left Side: Context / Instructions */}
        <div className="flex flex-col gap-6">
          <Card className="bg-slate-900/60 border-slate-800 rounded-2xl shadow-xl p-4">
            <h2 className="text-lg font-bold text-white mb-4">Simulation Progress</h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span>Questions Completed</span>
                  <span>{answeredCount} / {questions.length}</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <h3 className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-3">Topic Checklist</h3>
                <div className="space-y-2">
                  {questions.map((q, idx) => (
                    <div key={q.id || idx} className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-850 rounded-xl">
                      <span className="text-slate-300 text-xs truncate max-w-[180px]">
                        {idx + 1}. {q.question}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        q.answer !== null ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {q.answer !== null ? 'Complete' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800 rounded-2xl shadow-xl p-4">
            <h3 className="text-slate-200 font-bold text-sm flex items-center gap-2 mb-3">
              <SafetyCertificateOutlined className="text-violet-400" /> Ground Rules
            </h3>
            <ul className="text-slate-400 text-xs space-y-2 leading-relaxed list-disc pl-4">
              <li>Formulate detailed technical answers explaining your choices.</li>
              <li>Provide concrete architectural design trade-offs where applicable.</li>
              <li>Avoid looking up references mid-simulation for realistic pacing.</li>
              <li>Submit each answer to trigger the agent's grading and retrieve the next question.</li>
            </ul>
          </Card>
        </div>

        {/* Right Side: Conversation Box */}
        <div className="lg:col-span-2">
          <InterviewChat
            questions={questions}
            currentQuestion={currentQuestion}
            onAnswerSubmit={handleAnswerSubmit}
            submitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}
