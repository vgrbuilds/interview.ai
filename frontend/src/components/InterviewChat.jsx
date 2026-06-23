import React, { useState } from 'react';
import { Input, Button, List, Space, Alert } from 'antd';
import { SendOutlined, LoadingOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { TextArea } = Input;

export default function InterviewChat({ questions, currentQuestion, onAnswerSubmit, submitting }) {
  const [answerText, setAnswerText] = useState('');

  const handleSubmit = () => {
    if (!answerText.trim()) return;
    onAnswerSubmit(answerText);
    setAnswerText('');
  };

  // Filter completed questions
  const answeredQuestions = questions.filter(q => q.answer !== null);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Active Question Banner */}
      {currentQuestion ? (
        <div className="p-5 bg-violet-950/20 border-b border-slate-800/80">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded">
              Question {answeredQuestions.length + 1} of {questions.length}
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              currentQuestion.difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-300' :
              currentQuestion.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300' :
              'bg-rose-500/20 text-rose-300'
            }`}>
              {currentQuestion.difficulty}
            </span>
          </div>
          <p className="text-white text-base font-semibold leading-relaxed">
            {currentQuestion.question}
          </p>
        </div>
      ) : (
        <div className="p-5 bg-emerald-950/20 border-b border-slate-800/80 text-center">
          <p className="text-emerald-400 font-semibold flex items-center justify-center gap-2">
            <CheckCircleOutlined /> Simulation Completed! Compiling feedback report...
          </p>
        </div>
      )}

      {/* Answer History / Conversational Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px] max-h-[420px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {answeredQuestions.length === 0 && (
          <div className="text-center py-12">
            <InfoCircleOutlined className="text-slate-600 text-3xl mb-3" />
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              No answers submitted yet. Read the active question above and type your response below.
            </p>
          </div>
        )}
        
        {answeredQuestions.map((q, index) => (
          <div key={q.id || index} className="space-y-3">
            {/* Question Text (Candidate perspective) */}
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-slate-950/60 border border-slate-800/80 text-slate-300 text-sm p-4 rounded-2xl rounded-tl-none">
                <span className="text-xs font-bold text-violet-400 block mb-1">Interviewer Question {index + 1}</span>
                {q.question}
              </div>
            </div>
            
            {/* Candidate Answer */}
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-violet-600 text-white text-sm p-4 rounded-2xl rounded-tr-none shadow-md">
                <span className="text-xs font-semibold text-violet-200 block mb-1">Your Response</span>
                {q.answer}
              </div>
            </div>

            {/* AI Grading Feedback */}
            {q.feedback && (
              <div className="flex justify-start pl-6 border-l-2 border-slate-800">
                <div className="max-w-[90%] text-xs text-slate-400 p-2 bg-slate-950/30 rounded-lg">
                  <span className="font-bold text-slate-300 block mb-1">
                    Evaluation Score: <span className="text-emerald-400">{q.score}/10</span>
                  </span>
                  {q.feedback}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Tray */}
      {currentQuestion && (
        <div className="p-4 bg-slate-950 border-t border-slate-800/80">
          <Space.Compact className="w-full" size="large">
            <TextArea
              rows={2}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your response here... (mention technologies, trade-offs, and past experience)"
              disabled={submitting}
              className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 hover:border-violet-500/50 focus:border-violet-500 resize-none py-2 rounded-l-xl"
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              type="primary"
              icon={submitting ? <LoadingOutlined /> : <SendOutlined />}
              onClick={handleSubmit}
              disabled={submitting || !answerText.trim()}
              className="bg-violet-600 hover:bg-violet-500 border-none h-auto px-6 rounded-r-xl text-white font-semibold flex items-center justify-center"
            >
              {submitting ? 'Evaluating' : 'Submit'}
            </Button>
          </Space.Compact>
          <div className="flex justify-between items-center mt-2 px-1">
            <span className="text-slate-500 text-[10px]">Press Enter to submit, Shift+Enter for newline</span>
            {submitting && (
              <span className="text-violet-400 text-[10px] animate-pulse">AI Agent is grading your answer...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
